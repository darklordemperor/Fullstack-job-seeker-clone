import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { JobApplication } from '../domain/application.model';
import { ApiResponse } from '../domain/api-response.model';
import { JobSeekerProfile } from '../domain/job-seeker-profile.model';
import { sampleApplications } from './sample-data';

@Injectable({ providedIn: 'root' })
export class JobSeekerRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  profile(): Observable<JobSeekerProfile> {
    return this.http.get<ApiResponse<JobSeekerProfile>>(`${this.apiUrl}/job-seeker/profile`).pipe(
      map((response) => response.data),
    );
  }

  updateProfile(profile: JobSeekerProfile): Observable<JobSeekerProfile> {
    return this.http.put<ApiResponse<JobSeekerProfile>>(`${this.apiUrl}/job-seeker/profile`, {
      ...profile,
      expectedSalaryMin: profile.expectedSalary.min,
      expectedSalaryMax: profile.expectedSalary.max,
      salaryCurrency: profile.expectedSalary.currency,
      expectedSalary: undefined,
      profileImageUrl: undefined,
    }).pipe(
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
    return this.http.get<ApiResponse<JobApplication[]>>(`${this.apiUrl}/applications/my`).pipe(
      map((response) => response.data.length > 0 ? response.data : sampleApplications),
      catchError(() => of(sampleApplications)),
    );
  }
}
