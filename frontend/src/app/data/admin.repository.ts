import { AdminRepositoryPort } from '../domain/repositories/admin.repository.port';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { JobApplication } from '../domain/application.model';
import { AdminStats } from '../domain/admin.model';
import { ApiResponse } from './dto/api-response';
import { PagedResponse } from '../domain/page.model';
import { User } from '../domain/user.model';
import { sampleApplications, sampleStats, sampleUsers } from './sample-data';

@Injectable({ providedIn: 'root' })
export class AdminRepository implements AdminRepositoryPort {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  usersPage(page: number): Observable<PagedResponse<User>> {
    return this.http.get<ApiResponse<PagedResponse<User>>>(`${this.apiUrl}/admin/users/page`, { params: { page, size: 8 } }).pipe(map(response => response.data));
  }

  applicationsPage(page: number): Observable<PagedResponse<JobApplication>> {
    return this.http.get<ApiResponse<PagedResponse<JobApplication>>>(`${this.apiUrl}/admin/applications/page`, { params: { page, size: 8 } }).pipe(map(response => response.data));
  }

  stats(): Observable<AdminStats> {
    if (environment.demoMode) return of(sampleStats);
    return this.http.get<ApiResponse<AdminStats>>(`${this.apiUrl}/admin/stats`).pipe(
      map((response) => response.data),
    );
  }

  users(): Observable<User[]> {
    if (environment.demoMode) return of(sampleUsers);
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/admin/users`).pipe(
      map((response) => response.data),
    );
  }

  applications(): Observable<JobApplication[]> {
    if (environment.demoMode) return of(sampleApplications);
    return this.http.get<ApiResponse<JobApplication[]>>(`${this.apiUrl}/admin/applications`).pipe(
      map((response) => response.data),
    );
  }

  banUser(id: string, reason: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/admin/users/${id}/ban`, { reason }).pipe(
      map(() => undefined),
    );
  }

  unbanUser(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/admin/users/${id}/ban`).pipe(
      map(() => undefined),
    );
  }

  deleteApplication(id: string, reason: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/admin/applications/${id}`, { body: { reason } }).pipe(
      map(() => undefined),
    );
  }
}
