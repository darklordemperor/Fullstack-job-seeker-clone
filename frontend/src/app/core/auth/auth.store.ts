import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { AuthRepository, LoginPayload, RegisterPayload } from '../../data/auth.repository';
import { User, UserRole } from '../../domain/user.model';
import { ToastService } from '../../shared/ui/toast/toast.service';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const emptyState: AuthState = {
  user: null,
  accessToken: null,
  role: null,
  isAuthenticated: false,
  loading: false,
};

const sessionKey = 'jobsdb-session';

function restoreSession(): AuthState {
  if (typeof localStorage === 'undefined') {
    return emptyState;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(sessionKey) ?? 'null') as Pick<AuthState, 'user' | 'accessToken' | 'role'> | null;
    return saved?.user && saved.accessToken && saved.role
      ? { ...saved, isAuthenticated: true, loading: false }
      : emptyState;
  } catch {
    return emptyState;
  }
}

function persistSession(user: User, accessToken: string, role: UserRole): void {
  localStorage.setItem(sessionKey, JSON.stringify({ user, accessToken, role }));
}

const initialState = restoreSession();

function userFromPayload(email: string, role: UserRole): User {
  return { id: 'me', email, role, banned: false };
}

function roleFromAccessToken(accessToken: string, email: string): UserRole {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: UserRole };
    if (payload.role) {
      return payload.role;
    }
  } catch {
    // Demo tokens and malformed tokens fall back to a predictable local role.
  }
  return email.includes('admin')
    ? 'ROLE_ADMIN'
    : email.includes('employer')
      ? 'ROLE_EMPLOYER'
      : 'ROLE_JOB_SEEKER';
}

function landingPage(role: UserRole): string {
  return role === 'ROLE_ADMIN'
    ? '/admin/dashboard'
    : role === 'ROLE_EMPLOYER'
      ? '/employer/dashboard'
      : '/jobs';
}

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ role }) => ({
    isAdmin: computed(() => role() === 'ROLE_ADMIN'),
    isEmployer: computed(() => role() === 'ROLE_EMPLOYER'),
    isJobSeeker: computed(() => role() === 'ROLE_JOB_SEEKER'),
  })),
  withMethods((store, repo = inject(AuthRepository), toast = inject(ToastService), router = inject(Router)) => ({
    login: rxMethod<LoginPayload>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap((payload) =>
          repo.login(payload).pipe(
            tapResponse({
              next: (tokens) => {
                const role = roleFromAccessToken(tokens.accessToken, payload.email);
                const user = userFromPayload(payload.email, role);
                patchState(store, {
                  user,
                  accessToken: tokens.accessToken,
                  role,
                  isAuthenticated: true,
                  loading: false,
                });
                persistSession(user, tokens.accessToken, role);
                toast.success('Signed in successfully');
                void router.navigateByUrl(landingPage(role));
              },
              error: (err: Error) => {
                patchState(store, { loading: false });
                toast.error(err.message);
              },
            }),
          ),
        ),
      ),
    ),
    registerJobSeeker: rxMethod<RegisterPayload>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap((payload) =>
          repo.registerJobSeeker(payload).pipe(
            tapResponse({
              next: (tokens) => {
                const user = userFromPayload(payload.email, 'ROLE_JOB_SEEKER');
                patchState(store, {
                  user,
                  accessToken: tokens.accessToken,
                  role: 'ROLE_JOB_SEEKER',
                  isAuthenticated: true,
                  loading: false,
                });
                persistSession(user, tokens.accessToken, 'ROLE_JOB_SEEKER');
                toast.success('Job seeker account created');
                void router.navigateByUrl('/jobs');
              },
              error: (err: Error) => {
                patchState(store, { loading: false });
                toast.error(err.message);
              },
            }),
          ),
        ),
      ),
    ),
    registerEmployer: rxMethod<RegisterPayload>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap((payload) =>
          repo.registerEmployer(payload).pipe(
            tapResponse({
              next: (tokens) => {
                const user = userFromPayload(payload.email, 'ROLE_EMPLOYER');
                patchState(store, {
                  user,
                  accessToken: tokens.accessToken,
                  role: 'ROLE_EMPLOYER',
                  isAuthenticated: true,
                  loading: false,
                });
                persistSession(user, tokens.accessToken, 'ROLE_EMPLOYER');
                toast.success('Employer account created');
                void router.navigateByUrl('/employer/dashboard');
              },
              error: (err: Error) => {
                patchState(store, { loading: false });
                toast.error(err.message);
              },
            }),
          ),
        ),
      ),
    ),
    demoRole(role: UserRole): void {
      const user = userFromPayload(`${role.toLowerCase()}@demo.local`, role);
      const accessToken = `demo-token-${role}`;
      patchState(store, {
        user,
        accessToken,
        role,
        isAuthenticated: true,
        loading: false,
      });
      persistSession(user, accessToken, role);
      toast.success(`Demo ${role.replace('ROLE_', '').toLowerCase()} session ready`);
      void router.navigateByUrl(landingPage(role));
    },
    logout(): void {
      localStorage.removeItem(sessionKey);
      patchState(store, emptyState);
      toast.info('Signed out');
      void router.navigateByUrl('/auth/login');
    },
  })),
);
