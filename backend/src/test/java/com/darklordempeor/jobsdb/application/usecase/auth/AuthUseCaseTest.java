package com.darklordempeor.jobsdb.application.usecase.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.darklordempeor.jobsdb.application.port.JwtPort;
import com.darklordempeor.jobsdb.domain.exception.DomainException;
import com.darklordempeor.jobsdb.domain.model.User;
import com.darklordempeor.jobsdb.domain.model.UserRole;
import com.darklordempeor.jobsdb.domain.repository.UserRepository;
import com.darklordempeor.jobsdb.interfaces.dto.request.LoginRequest;
import com.darklordempeor.jobsdb.interfaces.dto.request.RegisterRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.AuthResponse;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthUseCaseTest {
	@Mock
	private UserRepository users;
	@Mock
	private PasswordEncoder passwordEncoder;
	@Mock
	private JwtPort jwt;

	private AuthUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new AuthUseCase(users, passwordEncoder, jwt);
	}

	@Test
	void registerEncodesPasswordSavesUserAndReturnsTokens() {
		RegisterRequest request = new RegisterRequest("seeker@example.com", "password", "Seeker");
		when(passwordEncoder.encode("password")).thenReturn("encoded");
		when(users.save(org.mockito.ArgumentMatchers.any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
		when(jwt.createAccessToken(org.mockito.ArgumentMatchers.any(User.class))).thenReturn("access");
		when(jwt.createRefreshToken(org.mockito.ArgumentMatchers.any(User.class))).thenReturn("refresh");

		AuthResponse response = useCase.register(request, UserRole.ROLE_JOB_SEEKER);

		ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
		verify(users).save(captor.capture());
		User saved = captor.getValue();
		assertThat(saved.id()).isNotNull();
		assertThat(saved.email()).isEqualTo("seeker@example.com");
		assertThat(saved.passwordHash()).isEqualTo("encoded");
		assertThat(saved.role()).isEqualTo(UserRole.ROLE_JOB_SEEKER);
		assertThat(saved.banned()).isFalse();
		assertThat(saved.createdAt()).isNotNull();
		assertThat(response).isEqualTo(new AuthResponse("access", "refresh", "Bearer"));
	}

	@Test
	void registerRejectsExistingEmail() {
		when(users.existsByEmail("taken@example.com")).thenReturn(true);

		assertThatThrownBy(() -> useCase.register(
				new RegisterRequest("taken@example.com", "password", "Taken"),
				UserRole.ROLE_JOB_SEEKER))
				.isInstanceOf(DomainException.class);

		verify(users, never()).save(org.mockito.ArgumentMatchers.any());
	}

	@Test
	void loginReturnsTokensForValidCredentials() {
		User user = user(false);
		when(users.findByEmail(user.email())).thenReturn(Optional.of(user));
		when(passwordEncoder.matches("password", user.passwordHash())).thenReturn(true);
		when(jwt.createAccessToken(user)).thenReturn("access");
		when(jwt.createRefreshToken(user)).thenReturn("refresh");

		assertThat(useCase.login(new LoginRequest(user.email(), "password")))
				.isEqualTo(new AuthResponse("access", "refresh", "Bearer"));
	}

	@Test
	void loginRejectsUnknownUserInvalidPasswordAndBannedUser() {
		when(users.findByEmail("missing@example.com")).thenReturn(Optional.empty());
		assertThatThrownBy(() -> useCase.login(new LoginRequest("missing@example.com", "password")))
				.isInstanceOf(DomainException.class)
				.hasMessage("Invalid credentials");

		User user = user(false);
		when(users.findByEmail(user.email())).thenReturn(Optional.of(user));
		when(passwordEncoder.matches("wrong", user.passwordHash())).thenReturn(false);
		assertThatThrownBy(() -> useCase.login(new LoginRequest(user.email(), "wrong")))
				.isInstanceOf(DomainException.class)
				.hasMessage("Invalid credentials");

		User banned = new User(user.id(), "banned@example.com", user.passwordHash(), user.role(), true, user.createdAt());
		when(users.findByEmail(banned.email())).thenReturn(Optional.of(banned));
		assertThatThrownBy(() -> useCase.login(new LoginRequest(banned.email(), "password")))
				.isInstanceOf(DomainException.class)
				.hasMessage("Invalid credentials");
	}

	@Test
	void refreshReturnsProvidedRefreshToken() {
		assertThat(useCase.refresh("refresh"))
				.isEqualTo(new AuthResponse(null, "refresh", "Bearer"));
	}

	private User user(boolean banned) {
		return new User(UUID.randomUUID(), "seeker@example.com", "encoded", UserRole.ROLE_JOB_SEEKER, banned, Instant.now());
	}
}
