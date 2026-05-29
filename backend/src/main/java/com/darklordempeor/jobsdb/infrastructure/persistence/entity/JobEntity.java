package com.darklordempeor.jobsdb.infrastructure.persistence.entity;

import com.darklordempeor.jobsdb.domain.model.JobStatus;
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
@Table(name = "jobs")
public class JobEntity {
	@Id
	private UUID id;
	@Column(name = "employer_id", nullable = false)
	private UUID employerId;
	@Column(nullable = false)
	private String title;
	@Column(nullable = false, columnDefinition = "text")
	private String description;
	private String location;
	@Column(name = "salary_min")
	private Integer salaryMin;
	@Column(name = "salary_max")
	private Integer salaryMax;
	@Column(name = "salary_currency")
	private String salaryCurrency;
	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private JobStatus status;
	@Column(name = "created_at", nullable = false)
	private Instant createdAt;
}
