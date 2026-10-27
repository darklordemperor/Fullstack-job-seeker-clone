import { EmployerRepositoryPort } from '../domain/repositories/employer.repository.port';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './dto/api-response';
import { EmployerProfile } from '../domain/employer.model';
import { Job } from '../domain/job.model';
import { sampleJobs } from './sample-data';
import { PagedResponse } from '../domain/page.model';
import { JobApplication, ApplicationStatus } from '../domain/application.model';
import { ApplicationDetail, EmployerStats } from '../domain/hiring.model';

@Injectable({ providedIn: 'root' })
export class EmployerRepository implements EmployerRepositoryPort {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  profile(): Observable<EmployerProfile> {
    return this.http.get<ApiResponse<EmployerProfile>>(`${this.apiUrl}/employer/profile`).pipe(
      map((response) => response.data),
    );
  }

  jobs(): Observable<Job[]> {
    if (environment.demoMode) return of(sampleJobs);
    return this.http.get<ApiResponse<Job[]>>(`${this.apiUrl}/employer/jobs`).pipe(
      map((response) => response.data),
    );
  }

  createJob(job: Partial<Job>): Observable<Job> {
    return this.http.post<ApiResponse<Job>>(`${this.apiUrl}/jobs`, job).pipe(
      map((response) => response.data),
    );
  }

  updateJobStatus(id: string, status: Job['status']): Observable<Job> {
    return this.http.patch<ApiResponse<Job>>(`${this.apiUrl}/jobs/${id}/status`, { status }).pipe(
      map((response) => response.data),
    );
  }

  updateProfile(profile: EmployerProfile): Observable<EmployerProfile> {
    return this.http.put<ApiResponse<EmployerProfile>>(`${this.apiUrl}/employer/profile`, profile).pipe(
      map((response) => response.data),
    );
  }

  stats(): Observable<EmployerStats> {
    return this.http.get<ApiResponse<EmployerStats>>(`${this.apiUrl}/employer/stats`).pipe(map(response => response.data));
  }
  applicants(jobId: string, page = 0, status = ''): Observable<PagedResponse<JobApplication>> {
    return this.http.get<ApiResponse<PagedResponse<JobApplication>>>(`${this.apiUrl}/employer/jobs/${jobId}/applicants/page`, {
      params: { page, size: 8, ...(status ? { status } : {}) },
    }).pipe(map(response => response.data));
  }
  applicant(id: string): Observable<ApplicationDetail> {
    return this.http.get<ApiResponse<ApplicationDetail>>(`${this.apiUrl}/employer/applications/${id}`).pipe(map(response => response.data));
  }
  moveApplicant(id: string, expectedStatus: ApplicationStatus, status: ApplicationStatus, reason: string): Observable<JobApplication> {
    return this.http.patch<ApiResponse<JobApplication>>(`${this.apiUrl}/employer/applications/${id}/status`, { expectedStatus, status, reason }).pipe(map(response => response.data));
  }
}
