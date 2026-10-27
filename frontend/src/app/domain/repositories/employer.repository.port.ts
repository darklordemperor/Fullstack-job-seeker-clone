import type { Observable } from 'rxjs';
import { EmployerProfile } from '../employer.model';
import { Job } from '../job.model';
import { PagedResponse } from '../page.model';
import { JobApplication, ApplicationStatus } from '../application.model';
import { ApplicationDetail, EmployerStats } from '../hiring.model';

export interface EmployerRepositoryPort {
  profile(): Observable<EmployerProfile>;
  jobs(): Observable<Job[]>;
  createJob(job: Partial<Job>): Observable<Job>;
  updateJobStatus(id: string, status: Job['status']): Observable<Job>;
  updateProfile(profile: EmployerProfile): Observable<EmployerProfile>;
  stats(): Observable<EmployerStats>;
  applicants(jobId: string, page?: number, status?: string): Observable<PagedResponse<JobApplication>>;
  applicant(id: string): Observable<ApplicationDetail>;
  moveApplicant(id: string, expectedStatus: ApplicationStatus, status: ApplicationStatus, reason: string): Observable<JobApplication>;
}
