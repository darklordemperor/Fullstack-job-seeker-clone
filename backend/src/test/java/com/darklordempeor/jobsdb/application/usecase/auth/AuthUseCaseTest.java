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
import com.darklordempeor.jobsdb.application.model.LoginCommand;
import com.darklordempeor.jobsdb.application.model.RegisterCommand;
import com.darklordempeor.jobsdb.application.model.AuthTokens;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.darklordempeor.jobsdb.application.port.PasswordHashPort;

@ExtendWith(MockitoExtension.class)
class AuthUseCaseTest {
	@Mock
	private UserRepository users;
	@Mock
	private PasswordHashPort passwordEncoder;
	@Mock
	private JwtPort jwt;

	private AuthUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new AuthUseCase(users, passwordEncoder, jwt);
	}

	@Test
	void registerEncodesPasswordSavesUserAndReturnsTokens() {
		RegisterCommand request = new RegisterCommand("seeker@example.com", "password", "Seeker");
		when(passwordEncoder.encode("password")).thenReturn("encoded");
		when(users.save(org.mockito.ArgumentMatchers.any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
		when(jwt.createAccessToken(org.mockito.ArgumentMatchers.any(User.class))).thenReturn("access");
		when(jwt.createRefreshToken(org.mockito.ArgumentMatchers.any(User.class))).thenReturn("refresh");

		AuthTokens response = useCase.register(request, UserRole.ROLE_JOB_SEEKER);

		ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
		verify(users).save(captor.capture());
		User saved = captor.getValue();
		assertThat(saved.id()).isNotNull();
		assertThat(saved.email()).isEqualTo("seeker@example.com");
		assertThat(saved.passwordHash()).isEqualTo("encoded");
		assertThat(saved.role()).isEqualTo(UserRole.ROLE_JOB_SEEKER);
		assertThat(saved.banned()).isFalse();
		assertThat(saved.createdAt()).isNotNull();
		assertThat(response).isEqualTo(new AuthTokens("access", "refresh", "Bearer"));
	}

	@Test
	void registerRejectsExistingEmail() {
		when(users.existsByEmail("taken@example.com")).thenReturn(true);

		assertThatThrownBy(() -> useCase.register(
				new RegisterCommand("taken@example.com", "password", "Taken"),
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

		assertThat(useCase.login(new LoginCommand(user.email(), "password")))
				.isEqualTo(new AuthTokens("access", "refresh", "Bearer"));
	}

	@Test
	void loginRejectsUnknownUserInvalidPasswordAndBannedUser() {
		when(users.findByEmail("missing@example.com")).thenReturn(Optional.empty());
		assertThatThrownBy(() -> useCase.login(new LoginCommand("missing@example.com", "password")))
				.isInstanceOf(DomainException.class)
				.hasMessage("Invalid credentials");

		User user = user(false);
		when(users.findByEmail(user.email())).thenReturn(Optional.of(user));
		when(passwordEncoder.matches("wrong", user.passwordHash())).thenReturn(false);
		assertThatThrownBy(() -> useCase.login(new LoginCommand(user.email(), "wrong")))
				.isInstanceOf(DomainException.class)
				.hasMessage("Invalid credentials");

		User banned = new User(user.id(), "banned@example.com", user.passwordHash(), user.role(), true, user.createdAt());
		when(users.findByEmail(banned.email())).thenReturn(Optional.of(banned));
		assertThatThrownBy(() -> useCase.login(new LoginCommand(banned.email(), "password")))
				.isInstanceOf(DomainException.class)
				.hasMessage("Invalid credentials");
	}

	@Test
	void refreshConsumesOldTokenAndIssuesNewPair() {
        User user = user(false);
        when(jwt.consumeRefreshToken("refresh")).thenReturn(user.id());
        when(users.findById(user.id())).thenReturn(Optional.of(user));
        when(jwt.createAccessToken(user)).thenReturn("new-access");
        when(jwt.createRefreshToken(user)).thenReturn("new-refresh");
        assertThat(useCase.refresh("refresh")).isEqualTo(new AuthTokens("new-access", "new-refresh", "Bearer"));
        verify(jwt).consumeRefreshToken("refresh");
	}

	private User user(boolean banned) {
		return new User(UUID.randomUUID(), "seeker@example.com", "encoded", UserRole.ROLE_JOB_SEEKER, banned, Instant.now());
	}
@Test void refreshRejectsMissingAndBannedAccountsWithoutIssuingTokens() {
        User banned = user(true);
        when(jwt.consumeRefreshToken("missing")).thenReturn(banned.id());
        when(users.findById(banned.id())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> useCase.refresh("missing")).isInstanceOf(com.darklordempeor.jobsdb.domain.exception.UnauthorizedException.class);
        when(users.findById(banned.id())).thenReturn(Optional.of(banned));
        assertThatThrownBy(() -> useCase.refresh("missing")).isInstanceOf(com.darklordempeor.jobsdb.domain.exception.UnauthorizedException.class);
        verify(jwt, never()).createAccessToken(org.mockito.ArgumentMatchers.any());
        verify(jwt, never()).createRefreshToken(org.mockito.ArgumentMatchers.any());
    }
    @Test void invalidRefreshStopsBeforeAccountLookupAndLogoutRevokes() {
        when(jwt.consumeRefreshToken("invalid")).thenThrow(new com.darklordempeor.jobsdb.domain.exception.UnauthorizedException("Invalid token"));
        assertThatThrownBy(() -> useCase.refresh("invalid")).isInstanceOf(com.darklordempeor.jobsdb.domain.exception.UnauthorizedException.class);
        org.mockito.Mockito.verifyNoInteractions(users);
        verify(jwt, never()).createAccessToken(org.mockito.ArgumentMatchers.any());
        useCase.logout("valid");
        verify(jwt).revokeRefreshToken("valid");
    }
}
