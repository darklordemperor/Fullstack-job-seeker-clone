package com.darklordempeor.jobsdb.infrastructure.persistence.repository;

import com.darklordempeor.jobsdb.infrastructure.persistence.entity.UserEntity;
import com.darklordempeor.jobsdb.domain.model.UserRole;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaUserRepository extends JpaRepository<UserEntity, UUID> {
	Optional<UserEntity> findByEmail(String email);
	boolean existsByEmail(String email);
	long countByRole(UserRole role);
	long countByCreatedAtAfter(Instant since);
}
