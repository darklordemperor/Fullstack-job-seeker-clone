import { JobSeekerProfile } from '../../domain/job-seeker-profile.model';

/** Explicit writable fields keep read-only and future response fields out of PUT requests. */
export function toProfileRequest(profile: JobSeekerProfile) {
  return {
    fullName: profile.fullName, phone: profile.phone, dateOfBirth: profile.dateOfBirth,
    nationality: profile.nationality, location: profile.location, summary: profile.summary,
    expectedSalaryMin: profile.expectedSalary.min, expectedSalaryMax: profile.expectedSalary.max,
    salaryCurrency: profile.expectedSalary.currency, resumeUrl: profile.resumeUrl,
    skills: profile.skills.map(({ name, yearsOfExperience, level }) => ({ name, yearsOfExperience, level })),
    workExperiences: profile.workExperiences.map(({ company, title, startDate, endDate, description }) => ({ company, title, startDate, endDate, description })),
    educations: profile.educations.map(({ institution, degree, fieldOfStudy, graduationYear }) => ({ institution, degree, fieldOfStudy, graduationYear })),
    languages: profile.languages.map(({ language, proficiency }) => ({ language, proficiency })),
    licenses: profile.licenses.map(({ name, issuer, issuedYear, expiresYear, description }) => ({ name, issuer, issuedYear, expiresYear, description })),
  };
}
