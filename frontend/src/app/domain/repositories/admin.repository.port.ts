import type { Observable } from 'rxjs';
import { JobApplication } from '../application.model';
import { AdminStats } from '../admin.model';
import { PagedResponse } from '../page.model';
import { User } from '../user.model';

export interface AdminRepositoryPort {
  usersPage(page: number): Observable<PagedResponse<User>>;
  applicationsPage(page: number): Observable<PagedResponse<JobApplication>>;
  stats(): Observable<AdminStats>;
  users(): Observable<User[]>;
  applications(): Observable<JobApplication[]>;
  banUser(id: string, reason: string): Observable<void>;
  unbanUser(id: string): Observable<void>;
  deleteApplication(id: string, reason: string): Observable<void>;
}
