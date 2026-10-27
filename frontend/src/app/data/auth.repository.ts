import { AuthRepositoryPort } from '../domain/repositories/auth.repository.port';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './dto/api-response';
import { AuthTokens, UserRole } from '../domain/user.model';

import { LoginPayload, RegisterPayload } from '../domain/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthRepository implements AuthRepositoryPort {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  login(payload: LoginPayload): Observable<AuthTokens> {
    return this.http.post<ApiResponse<AuthTokens>>(`${this.apiUrl}/auth/login`, payload).pipe(map((response) => response.data));
  }

  registerJobSeeker(payload: RegisterPayload): Observable<AuthTokens> {
    return this.http.post<ApiResponse<AuthTokens>>(`${this.apiUrl}/auth/register/job-seeker`, payload).pipe(map((response) => response.data));
  }

  registerEmployer(payload: RegisterPayload): Observable<AuthTokens> {
    return this.http.post<ApiResponse<AuthTokens>>(`${this.apiUrl}/auth/register/employer`, payload).pipe(map((response) => response.data));
  }

  demoLogin(role: UserRole): Observable<AuthTokens> {
    return of({
      accessToken: `demo-token-${role}`,
      refreshToken: `demo-refresh-${role}`,
      tokenType: 'Bearer',
    });
  }

  logout(refreshToken: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/auth/logout`, { refreshToken }).pipe(map(() => undefined));
  }
}
