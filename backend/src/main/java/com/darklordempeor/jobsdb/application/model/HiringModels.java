package com.darklordempeor.jobsdb.application.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import com.darklordempeor.jobsdb.domain.model.ApplicationStatus;

public final class HiringModels {
    private HiringModels() {}
    public record Page<T>(List<T> content, long totalElements, int totalPages, int page) {
        public static <T> Page<T> of(List<T> content, long total, int page, int size) {
            return new Page<>(content, total, Math.max(1, (int) Math.ceil((double) total / size)), page);
        }
    }
    public record Company(UUID userId, String companyName, String website, String description, String location) {}
    public record Settings(String displayName, String contactEmail, boolean discoverable, boolean recommendations) {}
    public record EmployerStats(long openJobs, long totalJobs, long applicants, long reviewing, long hired) {}
    public record JobState(boolean applied, boolean saved) {}
    public record SavedJob(UUID jobId, String title, String companyName, String location,
                           com.darklordempeor.jobsdb.domain.model.JobStatus status, Instant savedAt) {}
    public record UserView(UUID id, String email, String role, boolean banned, Instant createdAt) {}
    public record ApplicationView(UUID id, UUID jobId, UUID jobSeekerId, ApplicationStatus status, Instant appliedAt,
                                  String jobTitle, String companyName, String applicantName, String applicantEmail) {}
    public record Event(UUID id, ApplicationStatus fromStatus, ApplicationStatus toStatus, Instant createdAt,
                        UUID actorUserId, String internalNote) {}
    public record Submission(Profile profile, String applicantEmail, Instant capturedAt) {}
    public record Detail(ApplicationView application, Submission submission, List<Event> timeline,
                         com.darklordempeor.jobsdb.domain.model.Resume.Metadata resume) {
        public Detail(ApplicationView application, Submission submission, List<Event> timeline) {
            this(application, submission, timeline, null);
        }
    }
    public record Salary(Integer min, Integer max, String currency) {}
    public record Skill(String name, Integer yearsOfExperience, String level) {}
    public record Experience(String company, String title, LocalDate startDate, LocalDate endDate, String description) {}
    public record Education(String institution, String degree, String fieldOfStudy, Integer graduationYear) {}
    public record Language(String language, String proficiency) {}
    public record License(String name, String issuer, Integer issuedYear, Integer expiresYear, String description) {}
    public record Profile(UUID userId, String fullName, String phone, LocalDate dateOfBirth, String nationality,
                          String location, String summary, String profileImageUrl, Salary expectedSalary,
                          String resumeUrl, List<Skill> skills, List<Experience> workExperiences,
                          List<Education> educations, List<Language> languages, List<License> licenses) {}
}
