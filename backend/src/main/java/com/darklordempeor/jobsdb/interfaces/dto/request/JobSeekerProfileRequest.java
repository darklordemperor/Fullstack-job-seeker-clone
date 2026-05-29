package com.darklordempeor.jobsdb.interfaces.dto.request;

import java.time.LocalDate;
import java.util.List;

public record JobSeekerProfileRequest(
		String fullName,
		String phone,
		LocalDate dateOfBirth,
		String nationality,
		Integer expectedSalaryMin,
		Integer expectedSalaryMax,
		String salaryCurrency,
		List<SkillRequest> skills,
		List<WorkExperienceRequest> workExperiences,
		List<EducationRequest> educations,
		List<LanguageRequest> languages,
		String resumeUrl) {
}
