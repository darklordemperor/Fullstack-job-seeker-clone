import type { Observable } from 'rxjs';
import { JobApplication } from '../application.model';
import { JobSeekerProfile } from '../job-seeker-profile.model';
import { PagedResponse } from '../page.model';
import { ApplicationDetail, SeekerSettings } from '../hiring.model';
import { SavedJob } from '../saved-job.model';

export interface JobSeekerRepositoryPort {
  profile(): Observable<JobSeekerProfile>;
  updateProfile(profile: JobSeekerProfile): Observable<JobSeekerProfile>;
  uploadProfileImage(file: File): Observable<JobSeekerProfile>;
  apply(jobId: string): Observable<JobApplication>;
  myApplications(): Observable<JobApplication[]>;
  applicationsPage(page?: number): Observable<PagedResponse<JobApplication>>;
  application(id: string): Observable<ApplicationDetail>;
  settings(): Observable<SeekerSettings>;
  saveSettings(settings: SeekerSettings): Observable<SeekerSettings>;
  savedJobs(): Observable<string[]>;
  savedJobsPage(page?: number): Observable<PagedResponse<SavedJob>>;
  jobState(id: string): Observable<{ applied: boolean; saved: boolean }>;
  saveJob(id: string): Observable<void>;
  unsaveJob(id: string): Observable<void>;
}
