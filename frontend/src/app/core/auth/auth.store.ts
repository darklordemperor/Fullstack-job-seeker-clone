import { computed, inject } from '@angular/core';
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

const initialState: AuthState = {
  user: null,
  accessToken: null,
  role: null,
  isAuthenticated: false,
  loading: false,
};

function userFromPayload(email: string, role: UserRole): User {
  return { id: 'me', email, role, banned: false };
}

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ role }) => ({
    isAdmin: computed(() => role() === 'ROLE_ADMIN'),
    isEmployer: computed(() => role() === 'ROLE_EMPLOYER'),
    isJobSeeker: computed(() => role() === 'ROLE_JOB_SEEKER'),
  })),
  withMethods((store, repo = inject(AuthRepository), toast = inject(ToastService)) => ({
    login: rxMethod<LoginPayload>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap((payload) =>
          repo.login(payload).pipe(
            tapResponse({
              next: (tokens) => {
                const role: UserRole = payload.email.includes('admin')
                  ? 'ROLE_ADMIN'
                  : payload.email.includes('employer')
                    ? 'ROLE_EMPLOYER'
                    : 'ROLE_JOB_SEEKER';
                patchState(store, {
                  user: userFromPayload(payload.email, role),
                  accessToken: tokens.accessToken,
                  role,
                  isAuthenticated: true,
                  loading: false,
                });
                toast.success('Signed in successfully');
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
                patchState(store, {
                  user: userFromPayload(payload.email, 'ROLE_JOB_SEEKER'),
                  accessToken: tokens.accessToken,
                  role: 'ROLE_JOB_SEEKER',
                  isAuthenticated: true,
                  loading: false,
                });
                toast.success('Job seeker account created');
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
                patchState(store, {
                  user: userFromPayload(payload.email, 'ROLE_EMPLOYER'),
                  accessToken: tokens.accessToken,
                  role: 'ROLE_EMPLOYER',
                  isAuthenticated: true,
                  loading: false,
                });
                toast.success('Employer account created');
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
      patchState(store, {
        user: userFromPayload(`${role.toLowerCase()}@demo.local`, role),
        accessToken: `demo-token-${role}`,
        role,
        isAuthenticated: true,
        loading: false,
      });
      toast.success(`Demo ${role.replace('ROLE_', '').toLowerCase()} session ready`);
    },
    logout(): void {
      patchState(store, initialState);
      toast.info('Signed out');
    },
  })),
);
