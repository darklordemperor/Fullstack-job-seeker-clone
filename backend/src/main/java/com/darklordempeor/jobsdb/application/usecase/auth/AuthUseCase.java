package com.darklordempeor.jobsdb.application.usecase.auth;

import com.darklordempeor.jobsdb.application.port.JwtPort;
import com.darklordempeor.jobsdb.domain.exception.DomainException;
import com.darklordempeor.jobsdb.domain.model.User;
import com.darklordempeor.jobsdb.domain.model.UserRole;
import com.darklordempeor.jobsdb.domain.repository.UserRepository;
import com.darklordempeor.jobsdb.domain.service.UserDomainService;
import com.darklordempeor.jobsdb.interfaces.dto.request.LoginRequest;
import com.darklordempeor.jobsdb.interfaces.dto.request.RegisterRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.AuthResponse;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthUseCase {
	private final UserRepository users;
	private final PasswordEncoder passwordEncoder;
	private final JwtPort jwt;
	private final UserDomainService userDomainService = new UserDomainService();

	public AuthUseCase(UserRepository users, PasswordEncoder passwordEncoder, JwtPort jwt) {
		this.users = users;
		this.passwordEncoder = passwordEncoder;
		this.jwt = jwt;
	}

	public AuthResponse register(RegisterRequest request, UserRole role) {
		userDomainService.ensureEmailAvailable(users, request.email());
		User user = new User(UUID.randomUUID(), request.email(), passwordEncoder.encode(request.password()), role, false, Instant.now());
		User saved = users.save(user);
		return tokens(saved);
	}

	public AuthResponse login(LoginRequest request) {
		User user = users.findByEmail(request.email()).orElseThrow(() -> new DomainException("Invalid credentials"));
		if (user.banned() || !passwordEncoder.matches(request.password(), user.passwordHash())) {
			throw new DomainException("Invalid credentials");
		}
		return tokens(user);
	}

	public AuthResponse refresh(String refreshToken) {
		return new AuthResponse(null, refreshToken, "Bearer");
	}

	private AuthResponse tokens(User user) {
		return new AuthResponse(jwt.createAccessToken(user), jwt.createRefreshToken(user), "Bearer");
	}
}
