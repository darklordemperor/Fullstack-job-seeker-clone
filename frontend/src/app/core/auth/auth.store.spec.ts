import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthStore } from './auth.store';
import { SessionService } from './session.service';
import { AUTH_REPOSITORY } from '../di/repository.tokens';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AuthTokens, UserRole } from '../../domain/user.model';

describe('Authentication state', () => {
  const tokens: AuthTokens = { accessToken: 'access', refreshToken: 'refresh', tokenType: 'Bearer' };
  function setup(role: UserRole = 'ROLE_EMPLOYER') {
    const current = signal<{ user: { role: UserRole }; refreshToken: string } | null>(null);
    const session = { current, accept: vi.fn(() => current.set({ user: { role }, refreshToken: 'refresh' })), clear: vi.fn(() => current.set(null)) };
    const repo = { login: vi.fn(), registerEmployer: vi.fn(), registerJobSeeker: vi.fn(), logout: vi.fn() };
    const router = { navigateByUrl: vi.fn().mockResolvedValue(true) }, toast = { error: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: AUTH_REPOSITORY, useValue: repo }, { provide: SessionService, useValue: session }, { provide: Router, useValue: router }, { provide: ToastService, useValue: toast }] });
    return { store: TestBed.inject(AuthStore), session, repo, router, toast };
  }
  it.each([
    ['ROLE_EMPLOYER', '/employer/dashboard'], ['ROLE_ADMIN', '/admin/dashboard'], ['ROLE_JOB_SEEKER', '/jobs'],
  ] as [UserRole, string][])('signs in %s and navigates only after success', (role, destination) => {
    const { store, repo, session, router } = setup(role);
    const pending = new Subject<AuthTokens>(); repo.login.mockReturnValue(pending);
    store.login({ email: 'person@example.com', password: 'password' });
    expect(store.loading()).toBe(true); expect(router.navigateByUrl).not.toHaveBeenCalled();
    pending.next(tokens); pending.complete();
    expect(store.loading()).toBe(false); expect(session.accept).toHaveBeenCalledWith(tokens);
    expect(router.navigateByUrl).toHaveBeenCalledWith(destination);
  });
  it('recovers from failed sign-in and registration without creating a session', () => {
    const { store, repo, session, router } = setup();
    for (const method of ['login', 'registerEmployer', 'registerJobSeeker'] as const) {
      repo[method].mockReturnValue(throwError(() => new Error('Rejected')));
      store[method]({ email: 'person@example.com', password: 'password', displayName: 'Name' });
      expect(store.loading()).toBe(false);
    }
    expect(session.accept).not.toHaveBeenCalled(); expect(router.navigateByUrl).not.toHaveBeenCalled();
    repo.login.mockReturnValue(of(tokens)); store.login({ email: 'person@example.com', password: 'password' });
    expect(store.isAuthenticated()).toBe(true);
  });
  it('clears local credentials even when logout revocation fails', async () => {
    const { store, repo, session, toast } = setup();
    session.accept(); repo.logout.mockReturnValue(throwError(() => new Error('Offline')));
    await store.logout();
    expect(session.clear).toHaveBeenCalled(); expect(store.isAuthenticated()).toBe(false);
    expect(repo.logout).toHaveBeenCalledWith('refresh'); expect(toast.error).toHaveBeenCalled();
  });
});
