import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../auth/auth.store';
import { AppLanguage, LanguageService } from '../../i18n/language.service';
import { ShellUiService } from '../shell-ui.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white">
      @if (shell.announcementVisible()) {
        <div class="border-b border-sky-100 bg-sky-50">
          <div class="shell flex min-h-7 items-center justify-between gap-4 text-[11px] text-[#174ea6]">
            <span>{{ language.text('Keep your profile updated so employers can discover you.', 'อัปเดตโปรไฟล์ของคุณเพื่อให้นายจ้างค้นพบคุณได้ง่ายขึ้น') }}</span>
            <button type="button" class="px-2 text-base leading-none text-[#174ea6]" aria-label="Dismiss announcement" (click)="shell.dismissAnnouncement()">x</button>
          </div>
        </div>
      }
      <nav class="shell flex h-14 items-center justify-between gap-6 text-sm">
        <a routerLink="/" class="flex items-center gap-2 font-bold text-slate-950">
          <span class="grid h-8 w-8 place-items-center rounded-full bg-[#1C3F6E] text-xs text-white">j</span>
          <span class="leading-tight">jobsdb<br><span class="text-[10px] font-medium text-slate-500">by seek</span></span>
        </a>
        <div class="hidden items-center gap-7 md:flex">
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
        <div class="relative flex items-center gap-2 text-xs">
          <button type="button" class="rounded-md px-2 py-2 font-semibold text-slate-600 hover:bg-slate-100" (click)="languageOpen.set(!languageOpen())">
            {{ language.current() }}⌄
          </button>
          @if (languageOpen()) {
            <div class="absolute right-24 top-11 w-32 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
              @for (item of languages; track item.value) {
                <button type="button" class="flex w-full justify-between rounded px-3 py-2 text-left hover:bg-slate-50" (click)="selectLanguage(item.value)">
                  {{ item.label }} @if (language.current() === item.value) { <span>✓</span> }
                </button>
              }
            </div>
          }
          @if (auth.isAuthenticated()) {
            <button type="button" class="flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1.5 font-semibold text-slate-700" (click)="accountOpen.set(!accountOpen())">
              <span class="grid h-7 w-7 place-items-center rounded-full bg-[#174ea6] text-white">{{ initials() }}</span>
              <span class="hidden sm:inline">{{ language.text('My account', 'บัญชีของฉัน') }}</span>
              <span>⌄</span>
            </button>
            @if (accountOpen()) {
              <div class="absolute right-0 top-12 w-52 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                @if (auth.isJobSeeker()) {
                  <a routerLink="/job-seeker/profile" class="block rounded px-3 py-2 hover:bg-slate-50">{{ language.text('Profile', 'โปรไฟล์') }}</a>
                  <a routerLink="/job-seeker/my-applications" class="block rounded px-3 py-2 hover:bg-slate-50">{{ language.text('My applications', 'ใบสมัครของฉัน') }}</a>
                  <a routerLink="/job-seeker/settings" class="block rounded px-3 py-2 hover:bg-slate-50">{{ language.text('Settings', 'การตั้งค่า') }}</a>
                }
                @if (auth.isEmployer()) {
                  <a routerLink="/employer/manage-jobs" class="block rounded px-3 py-2 hover:bg-slate-50">{{ language.text('Manage jobs', 'จัดการงาน') }}</a>
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
    </header>
  `,
})
export class NavbarComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly language = inject(LanguageService);
  protected readonly shell = inject(ShellUiService);
  protected readonly languageOpen = signal(false);
  protected readonly accountOpen = signal(false);
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
