import { JobApplication, ApplicationStatus } from './application.model';
import { JobSeekerProfile } from './job-seeker-profile.model';
import { ResumeMetadata } from './resume.model';
export interface EmployerStats { openJobs: number; totalJobs: number; applicants: number; reviewing: number; hired: number }
export interface ApplicationEvent { id: string; fromStatus: ApplicationStatus | null; toStatus: ApplicationStatus; createdAt: string; actorUserId: string | null; internalNote: string | null }
export interface ApplicationDetail {
  application: JobApplication;
  submission: { profile: JobSeekerProfile; applicantEmail: string; capturedAt: string } | null;
  timeline: ApplicationEvent[];
  resume?: ResumeMetadata | null;
}
export interface SeekerSettings { displayName: string; contactEmail: string; discoverable: boolean; recommendations: boolean }
