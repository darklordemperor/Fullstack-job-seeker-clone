package com.darklordempeor.jobsdb.application.model;

public record JobSeekerProfileCommand(
        String fullName,
        String phone,
        java.time.LocalDate dateOfBirth,
        String nationality,
        String location,
        String summary,
        Integer expectedSalaryMin,
        Integer expectedSalaryMax,
        String salaryCurrency,
        java.util.List<HiringModels.Skill> skills,
        java.util.List<HiringModels.Experience> workExperiences,
        java.util.List<HiringModels.Education> educations,
        java.util.List<HiringModels.Language> languages,
        java.util.List<HiringModels.License> licenses,
        String resumeUrl) {}
