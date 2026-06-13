import { inject, Injectable } from '@angular/core';
import { AuthRepository, LoginPayload, RegisterPayload } from '../../data/auth.repository';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly repository = inject(AuthRepository);

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
