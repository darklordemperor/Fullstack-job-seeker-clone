import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../auth/auth.store';
import { AppLanguage, LanguageService } from '../../i18n/language.service';
import { ShellUiService } from '../shell-ui.service';
import { NotificationBadgeComponent } from '../../notifications/notification-badge.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NotificationBadgeComponent],
  template: `
    <header (keydown.escape)="closeNavigation(menuToggle)" class="sticky top-0 z-40 border-b border-slate-200 bg-white">
      @if (shell.announcementVisible()) {
        <div class="border-b border-sky-100 bg-sky-50">
          <div class="shell flex min-h-7 items-center justify-between gap-4 text-[11px] text-[#174ea6]">
            <span>{{ language.text('Keep your profile up to date before applying.', 'อัปเดตโปรไฟล์ของคุณก่อนสมัครงาน') }}</span>
            <button type="button" class="px-2 text-base leading-none text-[#174ea6]" aria-label="Dismiss announcement" (click)="shell.dismissAnnouncement()">x</button>
          </div>
        </div>
      }
      <nav aria-label="Main navigation" class="shell flex h-14 items-center justify-between gap-2 text-sm lg:gap-6">
        <a routerLink="/" class="flex shrink-0 items-center gap-2 font-bold text-slate-950">
          <span class="grid h-8 w-8 place-items-center rounded-full bg-[#1C3F6E] text-xs text-white">j</span>
          <span class="leading-tight">jobsdb<br><span class="text-[10px] font-medium text-slate-500">by seek</span></span>
        </a>
        <div class="hidden items-center gap-7 lg:flex">
          <a routerLink="/jobs" routerLinkActive="border-[#1C3F6E] text-[#1C3F6E]" class="border-b-2 border-transparent py-5 font-semibold">{{ language.text('Find jobs', 'ค้นหางาน') }}</a>
          @if (!auth.isAuthenticated() || auth.isJobSeeker()) {
            <a routerLink="/job-seeker/profile" class="py-5 text-slate-600">{{ language.text('Profile', 'โปรไฟล์') }}</a>
          }
          @if (auth.isEmployer()) {
            <a routerLink="/employer/dashboard" class="py-5 text-slate-600">{{ language.text('Employer dashboard', 'แดชบอร์ดนายจ้าง') }}</a>
            <a routerLink="/employer/post-job" class="py-5 text-slate-600">{{ language.text('Post a job', 'ประกาศงาน') }}</a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin/dashboard" class="py-5 text-slate-600">{{ language.text('Admin dashboard', 'แดชบอร์ดผู้ดูแล') }}</a>
            <a routerLink="/admin/users" class="py-5 text-slate-600">{{ language.text('Users', 'ผู้ใช้งาน') }}</a>
            <a routerLink="/admin/applications" class="py-5 text-slate-600">{{ language.text('Applications', 'ใบสมัคร') }}</a>
          }
        </div>
        <button #menuToggle type="button" class="ml-auto min-h-11 min-w-11 shrink-0 rounded-md px-2 font-semibold hover:bg-slate-100 lg:hidden"
          aria-controls="mobile-navigation" [attr.aria-expanded]="navigationOpen()" (click)="navigationOpen.set(!navigationOpen()); accountOpen.set(false); languageOpen.set(false)">
          <span class="sr-only sm:not-sr-only">{{ language.text('Menu', 'เมนู') }}</span>
          <svg class="mx-auto h-5 w-5 sm:hidden" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div class="relative flex items-center gap-2 text-xs">
          <button #languageToggle type="button" aria-label="Choose language" aria-controls="language-options" [attr.aria-expanded]="languageOpen()" class="rounded-md px-2 py-2 font-semibold text-slate-600 hover:bg-slate-100" (click)="languageOpen.set(!languageOpen()); accountOpen.set(false); navigationOpen.set(false)" (keydown.escape)="dismissDisclosure($event, languageToggle)">
            {{ language.current() }}⌄
          </button>
          @if (languageOpen()) {
            <div id="language-options" (keydown.escape)="dismissDisclosure($event, languageToggle)" class="absolute right-24 top-11 w-32 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
              @for (item of languages; track item.value) {
                <button type="button" class="flex w-full justify-between rounded px-3 py-2 text-left hover:bg-slate-50" (click)="selectLanguage(item.value); languageToggle.focus()">
                  {{ item.label }} @if (language.current() === item.value) { <span>✓</span> }
                </button>
              }
            </div>
          }
          @if (auth.isAuthenticated()) {
            <app-notification-badge />
            <button #accountToggle type="button" aria-controls="account-options" [attr.aria-expanded]="accountOpen()" (keydown.escape)="dismissDisclosure($event, accountToggle)" class="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-slate-100 px-2 py-1.5 font-semibold text-slate-700" [attr.aria-label]="language.text('My account', 'บัญชีของฉัน')" (click)="accountOpen.set(!accountOpen()); languageOpen.set(false); navigationOpen.set(false)">
              <span class="grid h-7 w-7 place-items-center rounded-full bg-[#174ea6] text-white">{{ initials() }}</span>
              <span class="hidden sm:inline">{{ language.text('My account', 'บัญชีของฉัน') }}</span>
              <span class="hidden sm:inline">⌄</span>
            </button>
            @if (accountOpen()) {
              <div id="account-options" (click)="closeMenus()" (keydown.escape)="dismissDisclosure($event, accountToggle)" class="absolute right-0 top-12 w-52 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                @if (auth.isJobSeeker()) {
                  <a routerLink="/job-seeker/profile" class="block rounded px-3 py-2 hover:bg-slate-50">{{ language.text('Profile', 'โปรไฟล์') }}</a>
                  <a routerLink="/job-seeker/saved-jobs" (click)="closeMenus()" class="block rounded px-3 py-2 hover:bg-slate-50">{{ language.text('Saved jobs', 'งานที่บันทึกไว้') }}</a>
                  <a routerLink="/job-seeker/saved-searches" (click)="closeMenus()" class="block rounded px-3 py-2 hover:bg-slate-50">{{ language.text('Saved searches & alerts', 'การค้นหาที่บันทึกไว้') }}</a>
                  <a routerLink="/job-seeker/my-applications" class="block rounded px-3 py-2 hover:bg-slate-50">{{ language.text('My applications', 'ใบสมัครของฉัน') }}</a>
                  <a routerLink="/job-seeker/interviews" (click)="closeMenus()" class="block rounded px-3 py-2">{{ language.text('Interviews', 'สัมภาษณ์งาน') }}</a>
                  <a routerLink="/job-seeker/settings" class="block rounded px-3 py-2 hover:bg-slate-50">{{ language.text('Settings', 'การตั้งค่า') }}</a>
                }
                @if (auth.isEmployer()) {
                  <a routerLink="/employer/manage-jobs" class="block rounded px-3 py-2 hover:bg-slate-50">{{ language.text('Manage jobs', 'จัดการงาน') }}</a>
                  <a routerLink="/employer/interviews" (click)="closeMenus()" class="block rounded px-3 py-2">{{ language.text('Interviews', 'สัมภาษณ์งาน') }}</a>
                  <a routerLink="/employer/settings" class="block rounded px-3 py-2 hover:bg-slate-50">{{ language.text('Company settings', 'ตั้งค่าบริษัท') }}</a>
                }
                @if (auth.isAdmin()) {
                  <a routerLink="/admin/users" class="block rounded px-3 py-2 hover:bg-slate-50">{{ language.text('Manage users', 'จัดการผู้ใช้') }}</a>
                  <a routerLink="/admin/applications" class="block rounded px-3 py-2 hover:bg-slate-50">{{ language.text('Moderate applications', 'จัดการใบสมัคร') }}</a>
                }
                <button type="button" class="mt-1 w-full border-t border-slate-100 px-3 py-2 text-left font-semibold text-red-600" (click)="auth.logout()">{{ language.text('Logout', 'ออกจากระบบ') }}</button>
              </div>
            }
          } @else {
            <a routerLink="/auth/login" class="font-semibold text-[#1C3F6E]">{{ language.text('Sign in', 'เข้าสู่ระบบ') }}</a>
            <a routerLink="/auth/register-employer" class="hidden font-semibold text-[#1C3F6E] sm:inline">{{ language.text('Employer login', 'สำหรับนายจ้าง') }}</a>
          }
        </div>
      </nav>
      @if (navigationOpen()) {
        <nav id="mobile-navigation" aria-label="Mobile navigation" class="max-h-[calc(100dvh-6rem)] overflow-y-auto border-t border-slate-200 bg-white lg:hidden" (click)="closeMenus()">
          <div class="shell grid gap-1 py-3 text-sm font-semibold [&_a]:rounded-md [&_a]:px-3 [&_a]:py-3 [&_a:hover]:bg-slate-100">
            <a routerLink="/jobs">{{ language.text('Find jobs', 'ค้นหางาน') }}</a>
            @if (auth.isJobSeeker()) {
              <a routerLink="/job-seeker/profile">{{ language.text('Profile', 'โปรไฟล์') }}</a>
              <a routerLink="/job-seeker/saved-jobs">{{ language.text('Saved jobs', 'งานที่บันทึกไว้') }}</a>
              <a routerLink="/job-seeker/saved-searches">{{ language.text('Saved searches & alerts', 'การค้นหาที่บันทึกไว้') }}</a>
              <a routerLink="/job-seeker/my-applications">{{ language.text('My applications', 'ใบสมัครของฉัน') }}</a>
              <a routerLink="/job-seeker/settings">{{ language.text('Settings', 'การตั้งค่า') }}</a>
            }
            @if (auth.isEmployer()) {
              <a routerLink="/employer/dashboard">{{ language.text('Employer dashboard', 'แดชบอร์ดนายจ้าง') }}</a>
              <a routerLink="/employer/post-job">{{ language.text('Post a job', 'ประกาศงาน') }}</a>
              <a routerLink="/employer/manage-jobs">{{ language.text('Manage jobs', 'จัดการงาน') }}</a>
              <a routerLink="/employer/settings">{{ language.text('Company settings', 'ตั้งค่าบริษัท') }}</a>
            }
            @if (auth.isAdmin()) {
              <a routerLink="/admin/dashboard">{{ language.text('Admin dashboard', 'แดชบอร์ดผู้ดูแล') }}</a>
              <a routerLink="/admin/users">{{ language.text('Users', 'ผู้ใช้งาน') }}</a>
              <a routerLink="/admin/applications">{{ language.text('Applications', 'ใบสมัคร') }}</a>
            }
            @if (!auth.isAuthenticated()) {
              <a routerLink="/auth/login">{{ language.text('Sign in', 'เข้าสู่ระบบ') }}</a>
              <a routerLink="/auth/register-job-seeker">{{ language.text('Create job seeker account', 'สร้างบัญชีผู้สมัครงาน') }}</a>
              <a routerLink="/auth/register-employer">{{ language.text('Create employer account', 'สร้างบัญชีนายจ้าง') }}</a>
            } @else {
              <button type="button" class="min-h-11 rounded-md px-3 text-left text-red-700" (click)="auth.logout()">{{ language.text('Logout', 'ออกจากระบบ') }}</button>
            }
          </div>
        </nav>
      }
    </header>
  `,
})
export class NavbarComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly language = inject(LanguageService);
  protected readonly shell = inject(ShellUiService);
  protected readonly navigationOpen = signal(false);
  protected closeMenus(): void { this.navigationOpen.set(false); this.accountOpen.set(false); this.languageOpen.set(false); }
  protected closeNavigation(button: HTMLButtonElement): void {
    const wasOpen = this.navigationOpen();
    this.closeMenus();
    if (wasOpen) button.focus();
  }
  protected readonly languageOpen = signal(false);
  protected readonly accountOpen = signal(false);
  protected dismissDisclosure(event: Event, button: HTMLButtonElement): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeMenus();
    button.focus();
  }
  protected readonly languages: { label: string; value: AppLanguage }[] = [
    { label: 'English', value: 'EN' },
    { label: 'ภาษาไทย', value: 'TH' },
  ];

  protected selectLanguage(language: AppLanguage): void {
    this.language.set(language);
    this.languageOpen.set(false);
  }

  protected initials(): string {
    return this.auth.isAdmin() ? 'AD' : this.auth.isEmployer() ? 'HR' : 'AN';
  }
}
