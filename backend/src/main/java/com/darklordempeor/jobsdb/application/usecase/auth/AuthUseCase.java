package com.darklordempeor.jobsdb.application.usecase.auth;

import com.darklordempeor.jobsdb.application.port.JwtPort;
import com.darklordempeor.jobsdb.domain.exception.UnauthorizedException;
import com.darklordempeor.jobsdb.domain.model.User;
import com.darklordempeor.jobsdb.domain.model.UserRole;
import com.darklordempeor.jobsdb.domain.repository.UserRepository;
import com.darklordempeor.jobsdb.domain.service.UserDomainService;
import com.darklordempeor.jobsdb.application.model.LoginCommand;
import com.darklordempeor.jobsdb.application.model.RegisterCommand;
import com.darklordempeor.jobsdb.application.model.AuthTokens;
import java.time.Instant;
import java.util.UUID;
import com.darklordempeor.jobsdb.application.port.PasswordHashPort;
import org.springframework.stereotype.Service;

@Service
@org.springframework.transaction.annotation.Transactional
public class AuthUseCase {
	private final UserRepository users;
	private final PasswordHashPort passwordEncoder;
	private final JwtPort jwt;
	private final UserDomainService userDomainService = new UserDomainService();

	public AuthUseCase(UserRepository users, PasswordHashPort passwordEncoder, JwtPort jwt) {
		this.users = users;
		this.passwordEncoder = passwordEncoder;
		this.jwt = jwt;
	}

	public AuthTokens register(RegisterCommand request, UserRole role) {
		userDomainService.ensureEmailAvailable(users, request.email());
		User user = new User(UUID.randomUUID(), request.email(), passwordEncoder.encode(request.password()), role, false, Instant.now());
		User saved = users.save(user);
		return tokens(saved);
	}

	public AuthTokens login(LoginCommand request) {
		User user = users.findByEmail(request.email()).orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
		if (user.banned() || !passwordEncoder.matches(request.password(), user.passwordHash())) {
			throw new UnauthorizedException("Invalid credentials");
		}
		return tokens(user);
	}

	public AuthTokens refresh(String refreshToken) {
        User user = users.findById(jwt.consumeRefreshToken(refreshToken))
                .filter(candidate -> !candidate.banned())
                .orElseThrow(() -> new UnauthorizedException("Session is no longer valid"));
        return tokens(user);
	}

    public void logout(String refreshToken) {
        jwt.revokeRefreshToken(refreshToken);
    }

	private AuthTokens tokens(User user) {
		return new AuthTokens(jwt.createAccessToken(user), jwt.createRefreshToken(user), "Bearer");
	}
}
