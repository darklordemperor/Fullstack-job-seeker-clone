import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import { AUTH_REPOSITORY } from '../di/repository.tokens';
import { LoginPayload, RegisterPayload } from '../../domain/auth.model';
import { AuthTokens, UserRole } from '../../domain/user.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { SessionService } from './session.service';

function landingPage(role: UserRole): string {
  return role === 'ROLE_ADMIN' ? '/admin/dashboard' : role === 'ROLE_EMPLOYER' ? '/employer/dashboard' : '/jobs';
}

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState({ loading: false }),
  withComputed((_, session = inject(SessionService)) => ({
    user: computed(() => session.current()?.user ?? null),
    accessToken: computed(() => session.current()?.accessToken ?? null),
    role: computed(() => session.current()?.user.role ?? null),
    isAuthenticated: computed(() => !!session.current()),
    isAdmin: computed(() => session.current()?.user.role === 'ROLE_ADMIN'),
    isEmployer: computed(() => session.current()?.user.role === 'ROLE_EMPLOYER'),
    isJobSeeker: computed(() => session.current()?.user.role === 'ROLE_JOB_SEEKER'),
  })),
  withMethods((store, repo = inject(AUTH_REPOSITORY), toast = inject(ToastService), router = inject(Router), session = inject(SessionService)) => {
    const success = (tokens: AuthTokens) => {
      session.accept(tokens);
      patchState(store, { loading: false });
      void router.navigateByUrl(landingPage(session.current()!.user.role));
    };
    const failure = () => { patchState(store, { loading: false }); };
    return {
      login: rxMethod<LoginPayload>(pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(payload => repo.login(payload).pipe(tapResponse({ next: success, error: failure }))),
      )),
      registerJobSeeker: rxMethod<RegisterPayload>(pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(payload => repo.registerJobSeeker(payload).pipe(tapResponse({ next: success, error: failure }))),
      )),
      registerEmployer: rxMethod<RegisterPayload>(pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(payload => repo.registerEmployer(payload).pipe(tapResponse({ next: success, error: failure }))),
      )),
      demoRole(role: UserRole): void { session.demo(role); if (session.current()) void router.navigateByUrl(landingPage(role)); },
      async logout(): Promise<void> {
        const token = session.current()?.refreshToken;
        session.clear();
        void router.navigateByUrl('/auth/login');
        if (token) {
          try { await firstValueFrom(repo.logout(token)); }
          catch { toast.error('Signed out locally. Server session revocation could not be confirmed.'); }
        }
      },
    };
  }),
);
