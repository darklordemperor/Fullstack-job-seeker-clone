import { toProfileRequest } from './mappers/profile-request.mapper';
import { JobSeekerRepositoryPort } from '../domain/repositories/job-seeker.repository.port';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { JobApplication } from '../domain/application.model';
import { ApiResponse } from './dto/api-response';
import { JobSeekerProfile } from '../domain/job-seeker-profile.model';
import { sampleApplications } from './sample-data';
import { PagedResponse } from '../domain/page.model';
import { ApplicationDetail, SeekerSettings } from '../domain/hiring.model';
import { SavedJob } from '../domain/saved-job.model';

@Injectable({ providedIn: 'root' })
export class JobSeekerRepository implements JobSeekerRepositoryPort {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  profile(): Observable<JobSeekerProfile> {
    return this.http.get<ApiResponse<JobSeekerProfile>>(`${this.apiUrl}/job-seeker/profile`).pipe(
      map((response) => response.data),
    );
  }

  updateProfile(profile: JobSeekerProfile): Observable<JobSeekerProfile> {
    return this.http.put<ApiResponse<JobSeekerProfile>>(`${this.apiUrl}/job-seeker/profile`, toProfileRequest(profile)).pipe(
      map((response) => response.data),
    );
  }

  uploadProfileImage(file: File): Observable<JobSeekerProfile> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<ApiResponse<JobSeekerProfile>>(`${this.apiUrl}/job-seeker/profile/image`, body).pipe(
      map((response) => response.data),
    );
  }

  apply(jobId: string): Observable<JobApplication> {
    return this.http.post<ApiResponse<JobApplication>>(`${this.apiUrl}/applications`, { jobId }).pipe(
      map((response) => response.data),
    );
  }

  myApplications(): Observable<JobApplication[]> {
    if (environment.demoMode) return of(sampleApplications);
    return this.http.get<ApiResponse<JobApplication[]>>(`${this.apiUrl}/applications/my`).pipe(
      map((response) => response.data),
    );
  }
  applicationsPage(page = 0): Observable<PagedResponse<JobApplication>> {
    return this.http.get<ApiResponse<PagedResponse<JobApplication>>>(`${this.apiUrl}/applications/my/page`, { params: { page, size: 8 } }).pipe(map(response => response.data));
  }
  application(id: string): Observable<ApplicationDetail> {
    return this.http.get<ApiResponse<ApplicationDetail>>(`${this.apiUrl}/applications/${id}`).pipe(map(response => response.data));
  }
  settings(): Observable<SeekerSettings> {
    return this.http.get<ApiResponse<SeekerSettings>>(`${this.apiUrl}/job-seeker/settings`).pipe(map(response => response.data));
  }
  saveSettings(settings: SeekerSettings): Observable<SeekerSettings> {
    return this.http.put<ApiResponse<SeekerSettings>>(`${this.apiUrl}/job-seeker/settings`, settings).pipe(map(response => response.data));
  }
  savedJobs(): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/job-seeker/saved-jobs`).pipe(map(response => response.data));
  }
  savedJobsPage(page = 0): Observable<PagedResponse<SavedJob>> {
    return this.http.get<ApiResponse<PagedResponse<SavedJob>>>(`${this.apiUrl}/job-seeker/saved-jobs/page`, {
      params: { page, size: 8 },
    }).pipe(map(response => response.data));
  }
  jobState(id: string): Observable<{ applied: boolean; saved: boolean }> {
    return this.http.get<ApiResponse<{ applied: boolean; saved: boolean }>>(`${this.apiUrl}/job-seeker/jobs/${id}/state`).pipe(map(response => response.data));
  }
  saveJob(id: string): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/job-seeker/saved-jobs/${id}`, {}).pipe(map(() => undefined));
  }
  unsaveJob(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/job-seeker/saved-jobs/${id}`).pipe(map(() => undefined));
  }
}
