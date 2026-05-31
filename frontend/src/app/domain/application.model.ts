export type ApplicationStatus = 'SUBMITTED' | 'REVIEWING' | 'REJECTED' | 'HIRED';

export interface JobApplication {
  id: string;
  jobId: string;
  jobSeekerId: string;
  status: ApplicationStatus;
  appliedAt: string;
  jobTitle?: string;
  companyName?: string;
  applicantName?: string;
  applicantEmail?: string;
}
