package com.darklordempeor.jobsdb.interfaces.dto.request;

import java.time.LocalDate;
import java.util.List;

public record JobSeekerProfileRequest(
		@jakarta.validation.constraints.Size(max=160) String fullName,
		String phone,
		LocalDate dateOfBirth,
		String nationality,
		String location,
		String summary,
		@jakarta.validation.constraints.PositiveOrZero Integer expectedSalaryMin,
		@jakarta.validation.constraints.PositiveOrZero Integer expectedSalaryMax,
		String salaryCurrency,
		@jakarta.validation.Valid @jakarta.validation.constraints.Size(max=100) List<SkillRequest> skills,
		@jakarta.validation.Valid @jakarta.validation.constraints.Size(max=100) List<WorkExperienceRequest> workExperiences,
		@jakarta.validation.Valid @jakarta.validation.constraints.Size(max=100) List<EducationRequest> educations,
		@jakarta.validation.Valid @jakarta.validation.constraints.Size(max=100) List<LanguageRequest> languages,
		@jakarta.validation.Valid @jakarta.validation.constraints.Size(max=100) List<LicenseRequest> licenses,
		@jakarta.validation.constraints.Pattern(regexp="^$|https?://[^\\s]+", message="must be an HTTP or HTTPS URL") String resumeUrl) {
    @jakarta.validation.constraints.AssertTrue(message="minimum salary must not exceed maximum salary")
    public boolean isSalaryRangeValid() { return expectedSalaryMin == null || expectedSalaryMax == null || expectedSalaryMin <= expectedSalaryMax; }
}
