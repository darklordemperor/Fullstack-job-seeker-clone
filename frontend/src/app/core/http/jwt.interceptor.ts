import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { SessionService } from '../auth/session.service';

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  // Never attach credentials to third-party URLs or authentication requests.
  if (!request.url.startsWith('/api/') || request.url.startsWith('/api/auth/')) return next(request);
  const token = session.current()?.accessToken;
  if (!token) return next(request);
  const send = (accessToken: string) => next(request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }));
  const refreshAndSend = () => session.refresh().pipe(
    catchError(error => { void router.navigate(['/auth/login']); return throwError(() => error); }),
    switchMap(send),
  );
  if (session.expired()) return refreshAndSend();
  return send(token).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status !== 401) return throwError(() => error);
    const current = session.current()?.accessToken;
    return current && current !== token ? send(current) : refreshAndSend();
  }));
};
