import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../domain/api-response.model';
import { EmployerProfile } from '../domain/employer.model';
import { Job } from '../domain/job.model';
import { sampleJobs } from './sample-data';

@Injectable({ providedIn: 'root' })
export class EmployerRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  profile(): Observable<EmployerProfile> {
    return this.http.get<ApiResponse<EmployerProfile>>(`${this.apiUrl}/employer/profile`).pipe(
      map((response) => response.data),
      catchError(() => of({ companyName: 'Sansiri Public Company Limited', location: 'Bangkok' })),
    );
  }

  jobs(): Observable<Job[]> {
    return this.http.get<ApiResponse<Job[]>>(`${this.apiUrl}/employer/jobs`).pipe(
      map((response) => response.data),
      catchError(() => of(sampleJobs)),
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
      catchError(() => of(profile)),
    );
  }
}
