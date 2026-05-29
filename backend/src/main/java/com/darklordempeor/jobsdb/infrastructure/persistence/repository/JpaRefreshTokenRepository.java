package com.darklordempeor.jobsdb.infrastructure.persistence.repository;

import com.darklordempeor.jobsdb.infrastructure.persistence.entity.RefreshTokenEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaRefreshTokenRepository extends JpaRepository<RefreshTokenEntity, UUID> {
	Optional<RefreshTokenEntity> findByTokenHash(String tokenHash);
}
