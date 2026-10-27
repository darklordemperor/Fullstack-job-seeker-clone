package com.darklordempeor.jobsdb.infrastructure.security;

import com.darklordempeor.jobsdb.domain.exception.UnauthorizedException;
import com.darklordempeor.jobsdb.domain.model.*;
import com.darklordempeor.jobsdb.infrastructure.persistence.entity.RefreshTokenEntity;
import com.darklordempeor.jobsdb.infrastructure.persistence.repository.JpaRefreshTokenRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.time.Instant;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class JwtServiceTest {
    private final JpaRefreshTokenRepository tokens = mock(JpaRefreshTokenRepository.class);
    private final JwtService jwt = new JwtService(new JwtProperties("test", "test-key-for-jwt-validation-at-least-64-characters-long-for-testing-only", 15, 7), tokens);
    private final User user = new User(UUID.randomUUID(), "person@example.com", "unused", UserRole.ROLE_JOB_SEEKER, false, Instant.now());

    @Test void refreshTokensCannotAuthenticateApiRequests() {
        String refresh = jwt.createRefreshToken(user);
        assertThatThrownBy(() -> jwt.parse(refresh)).isInstanceOf(UnauthorizedException.class);
        assertThat(jwt.parse(jwt.createAccessToken(user)).getSubject()).isEqualTo(user.id().toString());
    }
    @Test void refreshTokensAreHashedAndSingleUse() {
        String refresh = jwt.createRefreshToken(user);
        var captured = ArgumentCaptor.forClass(RefreshTokenEntity.class);
        verify(tokens).save(captured.capture());
        assertThat(captured.getValue().getTokenHash()).hasSize(64).doesNotContain(refresh);
        when(tokens.revoke(anyString(), any())).thenReturn(1, 0);
        assertThat(jwt.consumeRefreshToken(refresh)).isEqualTo(user.id());
        assertThatThrownBy(() -> jwt.consumeRefreshToken(refresh)).isInstanceOf(UnauthorizedException.class);
    }
    @Test void accessTokensCannotBeRefreshedAndMalformedTokensAreRejected() {
        assertThatThrownBy(() -> jwt.consumeRefreshToken(jwt.createAccessToken(user))).isInstanceOf(UnauthorizedException.class);
        assertThatThrownBy(() -> jwt.parse("not-a-jwt")).isInstanceOf(UnauthorizedException.class);
        verify(tokens, never()).revoke(anyString(), any());
    }
    @Test void tokensAreUniqueEvenWhenIssuedInTheSameSecond() {
        assertThat(jwt.createRefreshToken(user)).isNotEqualTo(jwt.createRefreshToken(user));
    }
}
