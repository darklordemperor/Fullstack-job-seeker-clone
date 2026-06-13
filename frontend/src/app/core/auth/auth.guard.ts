import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../../domain/user.model';
import { AuthStore } from './auth.store';

export const roleGuard = (role: UserRole): CanActivateFn =>
  () => {
    const auth = inject(AuthStore);
    return auth.role() === role
      ? true
      : inject(Router).createUrlTree(['/auth/login']);
  };
