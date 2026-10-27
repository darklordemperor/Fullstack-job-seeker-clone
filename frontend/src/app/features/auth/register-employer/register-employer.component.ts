import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthStore } from '../../../core/auth/auth.store';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-register-employer',
  standalone: true,
  imports: [ButtonComponent, FormsModule],
  template: `
    <main class="shell grid min-h-[calc(100vh-160px)] place-items-center py-10">
      <form #form="ngForm" class="card-surface w-full max-w-md p-7" (ngSubmit)="register(form)">
        <h1 class="text-2xl font-bold">Create employer account</h1>
        <label for="displayName" class="mt-6 block text-sm font-semibold">Company name</label>
        <input class="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" [ngModel]="displayName()" (ngModelChange)="displayName.set($event)" name="displayName" id="displayName" required autocomplete="organization">
        <label for="email" class="mt-4 block text-sm font-semibold">Email</label>
        <input class="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" [ngModel]="email()" (ngModelChange)="email.set($event)" name="email" id="email" required type="email" email autocomplete="email">
        <label for="password" class="mt-4 block text-sm font-semibold">Password</label>
        <input class="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" type="password" minlength="8" [ngModel]="password()" (ngModelChange)="password.set($event)" name="password" id="password" required autocomplete="new-password">
        <p class="mt-2 text-xs text-slate-500">Use at least 8 characters.</p>
        @if (form.submitted && form.invalid) { <p role="alert" class="mt-4 text-sm text-red-700">Enter your name, a valid email and a password of at least 8 characters.</p> }
        <app-button type="submit" class="mt-6 block" [disabled]="auth.loading()">Register employer</app-button>
      </form>
    </main>
  `,
})
export class RegisterEmployerComponent {
  protected readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  protected readonly displayName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');

  protected register(form: NgForm): void {
    if (form.invalid || this.auth.loading()) return;
    if (this.password().length < 8) {
      this.toast.error('Password must be at least 8 characters.');
      return;
    }

    this.auth.registerEmployer({ displayName: this.displayName(), email: this.email().trim(), password: this.password() });
  }
}
