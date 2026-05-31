package com.darklordempeor.jobsdb.interfaces.dto.request;

import java.time.LocalDate;
import java.util.List;

public record JobSeekerProfileRequest(
		String fullName,
		String phone,
		LocalDate dateOfBirth,
		String nationality,
		String location,
		String summary,
		Integer expectedSalaryMin,
		Integer expectedSalaryMax,
		String salaryCurrency,
		List<SkillRequest> skills,
		List<WorkExperienceRequest> workExperiences,
		List<EducationRequest> educations,
		List<LanguageRequest> languages,
		List<LicenseRequest> licenses,
		String resumeUrl) {
}
