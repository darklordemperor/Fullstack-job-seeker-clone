import { SESSION_REPOSITORY } from '../di/repository.tokens';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthTokens, User, UserRole } from '../../domain/user.model';

interface Session { user: User; accessToken: string; refreshToken: string | null; expiresAt: number }
const key = 'jobsdb-session';
const roles: UserRole[] = ['ROLE_ADMIN', 'ROLE_EMPLOYER', 'ROLE_JOB_SEEKER'];

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly repository = inject(SESSION_REPOSITORY);
  readonly current = signal<Session | null>(this.restore());
  private refreshing?: Observable<string>;

  accept(tokens: AuthTokens): void {
    const session = this.decode(tokens);
    localStorage.setItem(key, JSON.stringify(tokens));
    this.current.set(session);
  }
  clear(): void { localStorage.removeItem(key); this.current.set(null); }
  expired(): boolean { return (this.current()?.expiresAt ?? 0) <= Date.now() + 5000; }

  refresh(): Observable<string> {
    if (this.refreshing) return this.refreshing;
    const refreshToken = this.current()?.refreshToken;
    if (!refreshToken) return throwError(() => new Error('Please sign in again'));
    this.refreshing = this.repository.refresh(refreshToken).pipe(
      map(response => {
        if (this.current()?.refreshToken !== refreshToken) throw new Error('Session changed');
        this.accept(response);
        return response.accessToken;
      }),
      catchError(error => {
        if (this.current()?.refreshToken === refreshToken) this.clear();
        return throwError(() => error);
      }),
      finalize(() => { this.refreshing = undefined; }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshing;
  }
  demo(role: UserRole): void {
    if (!environment.demoMode) return;
    this.current.set({ user: { id: 'demo', email: 'demo@example.com', role, banned: false },
      accessToken: `demo-token-${role}`, refreshToken: null, expiresAt: Number.MAX_SAFE_INTEGER });
  }
  private restore(): Session | null {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return null;
      const session = this.decode(JSON.parse(saved) as AuthTokens);
      return session.expiresAt > Date.now() || session.refreshToken ? session : null;
    } catch { return null; }
  }
  private decode(tokens: AuthTokens): Session {
    const encoded = tokens.accessToken.split('.')[1];
    const claims = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))) as
      { sub?: string; email?: string; role?: UserRole; exp?: number; purpose?: string };
    if (!claims.sub || !claims.email || !claims.exp || claims.purpose !== 'access' || !claims.role || !roles.includes(claims.role)) {
      throw new Error('Invalid sign-in response');
    }
    return { user: { id: claims.sub, email: claims.email, role: claims.role, banned: false },
      accessToken: tokens.accessToken, refreshToken: tokens.refreshToken || null, expiresAt: claims.exp * 1000 };
  }
}
