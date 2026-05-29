import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../../core/auth/auth.store';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-register-job-seeker',
  standalone: true,
  imports: [ButtonComponent, FormsModule],
  template: `
    <main class="shell grid min-h-[calc(100vh-160px)] place-items-center py-10">
      <section class="card-surface w-full max-w-md p-7">
        <h1 class="text-2xl font-bold">Create job seeker account</h1>
        <label class="mt-6 block text-sm font-semibold">Full name</label>
        <input class="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" [ngModel]="displayName()" (ngModelChange)="displayName.set($event)" name="displayName">
        <label class="mt-4 block text-sm font-semibold">Email</label>
        <input class="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" [ngModel]="email()" (ngModelChange)="email.set($event)" name="email">
        <label class="mt-4 block text-sm font-semibold">Password</label>
        <input class="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" type="password" [ngModel]="password()" (ngModelChange)="password.set($event)" name="password">
        <app-button class="mt-6 block" (pressed)="register()">Register</app-button>
      </section>
    </main>
  `,
})
export class RegisterJobSeekerComponent {
  private readonly auth = inject(AuthStore);
  protected readonly displayName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');

  protected register(): void {
    this.auth.registerJobSeeker({ displayName: this.displayName(), email: this.email(), password: this.password() });
  }
}
