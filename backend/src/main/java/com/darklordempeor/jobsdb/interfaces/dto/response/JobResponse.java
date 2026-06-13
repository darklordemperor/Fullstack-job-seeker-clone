package com.darklordempeor.jobsdb.interfaces.dto.response;

import java.time.Instant;
import java.util.UUID;

public record JobResponse(
		UUID id,
		UUID employerId,
		String title,
		String description,
		String location,
		Integer salaryMin,
		Integer salaryMax,
		String salaryCurrency,
		String status,
		Instant createdAt) {
}
