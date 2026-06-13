package com.darklordempeor.jobsdb.domain.model;

import java.time.Instant;
import java.util.UUID;

public record Job(
		UUID id,
		UUID employerId,
		String title,
		String description,
		String location,
		Integer salaryMin,
		Integer salaryMax,
		String salaryCurrency,
		JobStatus status,
		Instant createdAt) {
}
