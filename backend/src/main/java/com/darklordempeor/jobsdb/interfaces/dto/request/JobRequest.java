package com.darklordempeor.jobsdb.interfaces.dto.request;

import jakarta.validation.constraints.NotBlank;

public record JobRequest(
		@NotBlank String title,
		@NotBlank String description,
		String location,
		Integer salaryMin,
		Integer salaryMax,
		String salaryCurrency) {
}
