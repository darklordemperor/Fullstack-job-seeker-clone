import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { UserRole } from '../../../domain/user.model';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ButtonComponent, FormsModule, RouterLink],
  template: `
    <main class="shell grid min-h-[calc(100vh-160px)] place-items-center py-10">
      <section class="card-surface w-full max-w-md p-7">
        <h1 class="text-2xl font-bold">Sign in</h1>
        <p class="mt-2 text-sm text-slate-600">Use a demo role or connect to the Spring Boot auth API.</p>
        <label class="mt-6 block text-sm font-semibold">Email</label>
        <input class="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" [ngModel]="email()" (ngModelChange)="email.set($event)" name="email">
        <label class="mt-4 block text-sm font-semibold">Password</label>
        <input class="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" type="password" [ngModel]="password()" (ngModelChange)="password.set($event)" name="password">
        <app-button class="mt-6 block" [disabled]="auth.loading()" (pressed)="login()">Sign in</app-button>
        <div class="mt-5 grid gap-2 sm:grid-cols-3">
          @for (role of roles; track role.value) {
            <button type="button" class="rounded border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700" (click)="auth.demoRole(role.value)">
              {{ role.label }}
            </button>
          }
        </div>
        <p class="mt-6 text-sm text-slate-600">
          New here?
          <a routerLink="/auth/register-job-seeker" class="font-semibold text-[#1C3F6E]">Create job seeker account</a>
        </p>
      </section>
    </main>
  `,
})
export class LoginComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly email = signal('jobseeker@demo.local');
  protected readonly password = signal('Password123!');
  protected readonly roles: { label: string; value: UserRole }[] = [
    { label: 'Job seeker', value: 'ROLE_JOB_SEEKER' },
    { label: 'Employer', value: 'ROLE_EMPLOYER' },
    { label: 'Admin', value: 'ROLE_ADMIN' },
  ];

  protected login(): void {
    this.auth.login({ email: this.email(), password: this.password() });
  }
}
