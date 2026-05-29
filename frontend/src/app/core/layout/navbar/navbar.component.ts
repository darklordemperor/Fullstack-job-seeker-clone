import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../auth/auth.store';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav class="shell flex h-14 items-center justify-between gap-6 text-sm">
        <a routerLink="/" class="flex items-center gap-2 font-bold text-slate-950">
          <span class="grid h-8 w-8 place-items-center rounded-full bg-[#1C3F6E] text-xs text-white">j</span>
          <span class="leading-tight">jobsdb<br><span class="text-[10px] font-medium text-slate-500">by seek</span></span>
        </a>
        <div class="hidden items-center gap-7 md:flex">
          <a routerLink="/jobs" routerLinkActive="border-[#1C3F6E] text-[#1C3F6E]" class="border-b-2 border-transparent py-5 font-semibold">Find jobs</a>
          <a routerLink="/job-seeker/profile" class="py-5 text-slate-600">Profile</a>
          <a routerLink="/employer/dashboard" class="py-5 text-slate-600">Companies</a>
          <a routerLink="/admin/dashboard" class="py-5 text-slate-600">Admin</a>
        </div>
        <div class="flex items-center gap-3 text-xs">
          <button type="button" class="hidden text-slate-600 sm:inline-flex">ภาษาไทย</button>
          @if (auth.isAuthenticated()) {
            <button type="button" class="rounded-full bg-slate-100 px-3 py-2 font-semibold text-slate-700" (click)="auth.logout()">Logout</button>
          } @else {
            <a routerLink="/auth/login" class="font-semibold text-[#1C3F6E]">Sign in</a>
            <a routerLink="/auth/register-employer" class="hidden font-semibold text-[#1C3F6E] sm:inline">Employer login</a>
          }
        </div>
      </nav>
    </header>
  `,
})
export class NavbarComponent {
  protected readonly auth = inject(AuthStore);
}
