package com.darklordempeor.jobsdb.infrastructure.security;

import com.darklordempeor.jobsdb.application.port.JwtPort;
import com.darklordempeor.jobsdb.domain.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService implements JwtPort {
	private final JwtProperties properties;
	private final SecretKey key;

	public JwtService(JwtProperties properties) {
		this.properties = properties;
		this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
	}

	@Override
	public String createAccessToken(User user) {
		return token(user, properties.accessTokenMinutes() * 60);
	}

	@Override
	public String createRefreshToken(User user) {
		return token(user, properties.refreshTokenDays() * 24 * 60 * 60);
	}

	public Claims parse(String token) {
		return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
	}

	private String token(User user, long seconds) {
		Instant now = Instant.now();
		return Jwts.builder()
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
