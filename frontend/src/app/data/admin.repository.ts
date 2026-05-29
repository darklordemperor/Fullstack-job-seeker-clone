import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { JobApplication } from '../domain/application.model';
import { AdminStats } from '../domain/admin.model';
import { ApiResponse } from '../domain/api-response.model';
import { User } from '../domain/user.model';
import { sampleApplications, sampleStats, sampleUsers } from './sample-data';

@Injectable({ providedIn: 'root' })
export class AdminRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  stats(): Observable<AdminStats> {
    return this.http.get<ApiResponse<AdminStats>>(`${this.apiUrl}/admin/stats`).pipe(
      map((response) => response.data),
      catchError(() => of(sampleStats)),
    );
  }

  users(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/admin/users`).pipe(
      map((response) => response.data),
      catchError(() => of(sampleUsers)),
    );
  }

  applications(): Observable<JobApplication[]> {
    return this.http.get<ApiResponse<JobApplication[]>>(`${this.apiUrl}/admin/applications`).pipe(
      map((response) => response.data),
      catchError(() => of(sampleApplications)),
    );
  }

  banUser(id: string, reason: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/admin/users/${id}/ban`, { reason }).pipe(map(() => undefined));
  }
}
