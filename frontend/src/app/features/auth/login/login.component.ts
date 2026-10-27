import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { UserRole } from '../../../domain/user.model';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ButtonComponent, FormsModule, RouterLink],
  template: `
    <main class="shell grid min-h-[calc(100vh-160px)] place-items-center py-10">
      <form #form="ngForm" class="card-surface w-full max-w-md p-7" (ngSubmit)="login(form)">
        <h1 class="text-2xl font-bold">Sign in</h1>
        <p class="mt-2 text-sm text-slate-600">Sign in to manage your jobs and applications.</p>
        <label for="email" class="mt-6 block text-sm font-semibold">Email</label>
        <input class="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" [ngModel]="email()" (ngModelChange)="email.set($event)" name="email" id="email" required type="email" email autocomplete="email">
        <label for="password" class="mt-4 block text-sm font-semibold">Password</label>
        <input class="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" type="password" [ngModel]="password()" (ngModelChange)="password.set($event)" name="password" id="password" required autocomplete="current-password">
        @if (form.submitted && form.invalid) { <p role="alert" class="mt-4 text-sm text-red-700">Enter a valid email and password.</p> }
        <app-button type="submit" class="mt-6 block" [disabled]="auth.loading()">Sign in</app-button>
        @if (demoMode) {
        <div class="mt-5 grid gap-2 sm:grid-cols-3" aria-label="Demo sessions">
          @for (role of roles; track role.value) {
            <button type="button" class="rounded border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700" (click)="auth.demoRole(role.value)">
              {{ role.label }}
            </button>
          }
        </div>
        }
        <p class="mt-6 text-sm text-slate-600">
          New here?
          <a routerLink="/auth/register-job-seeker" class="font-semibold text-[#1C3F6E]">Create job seeker account</a>
        </p>
      </form>
    </main>
  `,
})
export class LoginComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly demoMode = environment.demoMode;
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly roles: { label: string; value: UserRole }[] = [
    { label: 'Job seeker', value: 'ROLE_JOB_SEEKER' },
    { label: 'Employer', value: 'ROLE_EMPLOYER' },
    { label: 'Admin', value: 'ROLE_ADMIN' },
  ];

  protected login(form: NgForm): void {
    if (form.invalid || this.auth.loading()) return;
    this.auth.login({ email: this.email().trim(), password: this.password() });
  }
}
