import type { Observable } from 'rxjs';
import { AuthTokens, UserRole } from '../user.model';
import { LoginPayload, RegisterPayload } from '../auth.model';

export interface AuthRepositoryPort {
  login(payload: LoginPayload): Observable<AuthTokens>;
  registerJobSeeker(payload: RegisterPayload): Observable<AuthTokens>;
  registerEmployer(payload: RegisterPayload): Observable<AuthTokens>;
  demoLogin(role: UserRole): Observable<AuthTokens>;
  logout(refreshToken: string): Observable<void>;
}
