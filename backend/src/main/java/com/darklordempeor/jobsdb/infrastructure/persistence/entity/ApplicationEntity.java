package com.darklordempeor.jobsdb.infrastructure.persistence.entity;

import com.darklordempeor.jobsdb.domain.model.ApplicationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "applications")
public class ApplicationEntity {
	@Id
	private UUID id;
	@Column(name = "job_id", nullable = false)
	private UUID jobId;
	@Column(name = "job_seeker_id", nullable = false)
	private UUID jobSeekerId;
	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private ApplicationStatus status;
	@Column(name = "applied_at", nullable = false)
	private Instant appliedAt;
}
