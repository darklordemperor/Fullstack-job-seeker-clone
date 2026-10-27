package com.darklordempeor.jobsdb.infrastructure.security;

import com.darklordempeor.jobsdb.application.port.JwtPort;
import com.darklordempeor.jobsdb.domain.model.User;
import com.darklordempeor.jobsdb.domain.exception.UnauthorizedException;
import com.darklordempeor.jobsdb.infrastructure.persistence.entity.RefreshTokenEntity;
import com.darklordempeor.jobsdb.infrastructure.persistence.repository.JpaRefreshTokenRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import java.util.HexFormat;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JwtService implements JwtPort {
	private final JwtProperties properties;
	private final SecretKey key;
	private final JpaRefreshTokenRepository refreshTokens;

	public JwtService(JwtProperties properties, JpaRefreshTokenRepository refreshTokens) {
		this.properties = properties;
		this.refreshTokens = refreshTokens;
		this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
	}

	@Override
	public String createAccessToken(User user) {
		return token(user, properties.accessTokenMinutes() * 60, "access");
	}

	@Override
	@Transactional
	public String createRefreshToken(User user) {
		String token = token(user, properties.refreshTokenDays() * 24 * 60 * 60, "refresh");
        RefreshTokenEntity stored = new RefreshTokenEntity();
        stored.setId(UUID.randomUUID());
        stored.setUserId(user.id());
        stored.setTokenHash(hash(token));
        stored.setExpiresAt(parseToken(token, "refresh").getExpiration().toInstant());
        refreshTokens.save(stored);
        return token;
	}

	public Claims parse(String token) {
		return parseToken(token, "access");
	}

    private Claims parseToken(String token, String purpose) {
        try {
            return Jwts.parser().verifyWith(key).requireIssuer(properties.issuer())
                    .require("purpose", purpose).build().parseSignedClaims(token).getPayload();
        } catch (RuntimeException ex) {
            throw new UnauthorizedException("Invalid or expired token");
        }
    }

    @Override
    @Transactional
    public UUID consumeRefreshToken(String token) {
        Claims claims = parseToken(token, "refresh");
        if (refreshTokens.revoke(hash(token), Instant.now()) != 1) {
            throw new UnauthorizedException("Refresh token has expired or was already used");
        }
        return UUID.fromString(claims.getSubject());
    }

    @Override
    @Transactional
    public void revokeRefreshToken(String token) {
        parseToken(token, "refresh");
        refreshTokens.revoke(hash(token), Instant.now());
    }

    private String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

	private String token(User user, long seconds, String purpose) {
		Instant now = Instant.now();
		return Jwts.builder()
				.id(UUID.randomUUID().toString())
				.claim("purpose", purpose)
				.issuer(properties.issuer())
				.subject(user.id().toString())
				.claim("email", user.email())
				.claim("role", user.role().name())
				.issuedAt(Date.from(now))
				.expiration(Date.from(now.plusSeconds(seconds)))
				.signWith(key)
				.compact();
	}
}
