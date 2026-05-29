import { SalaryRange } from './job.model';

export interface Skill {
  name: string;
  yearsOfExperience?: number | null;
  level?: string | null;
}

export interface WorkExperience {
  company: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
}

export interface Education {
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  graduationYear?: number | null;
}

export interface Language {
  language: string;
  proficiency?: string | null;
}

export interface JobSeekerProfile {
  fullName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  expectedSalary: SalaryRange;
  skills: Skill[];
  workExperiences: WorkExperience[];
  educations: Education[];
  languages: Language[];
  resumeUrl?: string | null;
}
