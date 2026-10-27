import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './dto/api-response';
import { AuthTokens } from '../domain/user.model';
import { SessionRepositoryPort } from '../domain/repositories/session.repository.port';

@Injectable({ providedIn: 'root' })
export class SessionRepository implements SessionRepositoryPort {
  // Refresh must bypass auth interceptors to avoid recursively refreshing itself.
  private readonly http = new HttpClient(inject(HttpBackend));
  refresh(refreshToken: string) {
    return this.http.post<ApiResponse<AuthTokens>>(environment.apiUrl + '/auth/refresh-token', { refreshToken })
      .pipe(map(response => response.data));
  }
}
