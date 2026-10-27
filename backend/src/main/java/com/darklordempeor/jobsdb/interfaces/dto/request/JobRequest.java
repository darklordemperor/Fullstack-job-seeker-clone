package com.darklordempeor.jobsdb.interfaces.dto.request;

import jakarta.validation.constraints.NotBlank;

public record JobRequest(
		@NotBlank @jakarta.validation.constraints.Size(max=180) String title,
		@NotBlank @jakarta.validation.constraints.Size(max=20000) String description,
		@jakarta.validation.constraints.Size(max=180) String location,
		@jakarta.validation.constraints.PositiveOrZero Integer salaryMin,
		@jakarta.validation.constraints.PositiveOrZero Integer salaryMax,
		@jakarta.validation.constraints.Pattern(regexp="[A-Z]{3}", message="must be a three-letter currency code") String salaryCurrency) {
    @jakarta.validation.constraints.AssertTrue(message="minimum salary must not exceed maximum salary")
    public boolean isSalaryRangeValid() { return salaryMin == null || salaryMax == null || salaryMin <= salaryMax; }
}
