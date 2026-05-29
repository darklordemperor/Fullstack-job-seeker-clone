import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../../core/auth/auth.store';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-register-employer',
  standalone: true,
  imports: [ButtonComponent, FormsModule],
  template: `
    <main class="shell grid min-h-[calc(100vh-160px)] place-items-center py-10">
      <section class="card-surface w-full max-w-md p-7">
        <h1 class="text-2xl font-bold">Create employer account</h1>
        <label class="mt-6 block text-sm font-semibold">Company name</label>
        <input class="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" [ngModel]="displayName()" (ngModelChange)="displayName.set($event)" name="displayName">
        <label class="mt-4 block text-sm font-semibold">Email</label>
        <input class="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" [ngModel]="email()" (ngModelChange)="email.set($event)" name="email">
        <label class="mt-4 block text-sm font-semibold">Password</label>
        <input class="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" type="password" minlength="8" [ngModel]="password()" (ngModelChange)="password.set($event)" name="password">
        <p class="mt-2 text-xs text-slate-500">Use at least 8 characters.</p>
        <app-button class="mt-6 block" (pressed)="register()">Register employer</app-button>
      </section>
    </main>
  `,
})
export class RegisterEmployerComponent {
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  protected readonly displayName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');

  protected register(): void {
    if (this.password().length < 8) {
      this.toast.error('Password must be at least 8 characters.');
      return;
    }

    this.auth.registerEmployer({ displayName: this.displayName(), email: this.email(), password: this.password() });
  }
}
