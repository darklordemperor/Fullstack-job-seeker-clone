import { inject, Injectable } from '@angular/core';
import { AUTH_REPOSITORY } from '../di/repository.tokens';
import { LoginPayload, RegisterPayload } from '../../domain/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly repository = inject(AUTH_REPOSITORY);

  login(payload: LoginPayload) {
    return this.repository.login(payload);
  }

  registerJobSeeker(payload: RegisterPayload) {
    return this.repository.registerJobSeeker(payload);
  }

  registerEmployer(payload: RegisterPayload) {
    return this.repository.registerEmployer(payload);
  }
}
