export type JobStatus = 'ACTIVE' | 'CLOSED' | 'DRAFT';

export interface SalaryRange {
  min?: number | null;
  max?: number | null;
  currency: string;
}

export interface Job {
  id: string;
  employerId: string;
  title: string;
  description: string;
  companyName?: string;
  location?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  status: JobStatus;
  createdAt: string;
  industry?: string;
  imageUrl?: string;
  applicants?: number;
}

export interface JobFilter {
  q?: string;
  location?: string;
  page?: number;
  size?: number;
}
