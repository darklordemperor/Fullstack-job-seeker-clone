import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { AuthStore } from './auth.store';
import { roleGuard, authenticatedGuard } from './auth.guard';
import { UserRole } from '../../domain/user.model';

describe('Role route boundaries', () => {
  it.each([true,false])('protects the notification inbox with authenticated=%s',loggedIn => {
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthStore,useValue:{isAuthenticated:signal(loggedIn)}}]});
    const result=TestBed.runInInjectionContext(()=>authenticatedGuard({} as ActivatedRouteSnapshot,{} as RouterStateSnapshot));
    expect(result).toEqual(loggedIn ? true : TestBed.inject(Router).createUrlTree(['/auth/login']));
  });
  const roles: UserRole[] = ['ROLE_ADMIN', 'ROLE_EMPLOYER', 'ROLE_JOB_SEEKER'];
  for (const required of roles) {
    it.each([null, ...roles])(`protects ${required} from a %s session`, current => {
      TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthStore, useValue: { role: signal(current) } }] });
      const result = TestBed.runInInjectionContext(() => roleGuard(required)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
      if (current === required) expect(result).toBe(true);
      else expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/auth/login']));
    });
  }
});
