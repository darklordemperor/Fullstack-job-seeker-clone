package com.darklordempeor.jobsdb.interfaces.dto.request;

import java.time.LocalDate;
import jakarta.validation.constraints.NotBlank;

public record WorkExperienceRequest(
		@NotBlank @jakarta.validation.constraints.Size(max=180) String company,
		@NotBlank @jakarta.validation.constraints.Size(max=180) String title,
		@io.swagger.v3.oas.annotations.media.Schema(description="Optional start date, ISO yyyy-MM-dd", example="2022-01-10")
		LocalDate startDate,
		@io.swagger.v3.oas.annotations.media.Schema(description="Optional end date; null for an ongoing role or unspecified end date. Must not precede startDate when both are provided.", example="2025-03-31")
		LocalDate endDate,
		String description) {
    @jakarta.validation.constraints.AssertTrue(message="work experience end date must not precede start date")
    public boolean isDateRangeValid() {
        return startDate == null || endDate == null || !endDate.isBefore(startDate);
    }
}
