import type { Observable } from 'rxjs';
import { AuthTokens } from '../user.model';
export interface SessionRepositoryPort { refresh(refreshToken: string): Observable<AuthTokens>; }
