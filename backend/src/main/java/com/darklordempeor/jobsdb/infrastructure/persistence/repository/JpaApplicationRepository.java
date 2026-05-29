package com.darklordempeor.jobsdb.infrastructure.persistence.repository;

import com.darklordempeor.jobsdb.infrastructure.persistence.entity.ApplicationEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaApplicationRepository extends JpaRepository<ApplicationEntity, UUID> {
	List<ApplicationEntity> findByJobSeekerId(UUID jobSeekerId);
}
