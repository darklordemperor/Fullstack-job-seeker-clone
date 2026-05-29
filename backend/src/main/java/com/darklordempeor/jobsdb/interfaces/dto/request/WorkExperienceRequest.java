package com.darklordempeor.jobsdb.interfaces.dto.request;

import java.time.LocalDate;
import jakarta.validation.constraints.NotBlank;

public record WorkExperienceRequest(
		@NotBlank String company,
		@NotBlank String title,
		LocalDate startDate,
		LocalDate endDate,
		String description) {
}
