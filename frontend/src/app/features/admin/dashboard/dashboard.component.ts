import { Component, inject, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminStats } from '../../../domain/admin.model';
import { RouterLink } from '@angular/router';
import { ADMIN_REPOSITORY } from '../../../core/di/repository.tokens';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="shell py-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold">Admin dashboard</h1>
          <p class="mt-2 text-sm text-slate-600">Monitor platform usage, users, and job activity.</p>
        </div>
        <a routerLink="/jobs" class="rounded-md border border-slate-300 px-5 py-3 text-sm font-bold">Browse jobs</a>
      </div>
      @if (loading()) { <p class="mt-6" role="status">Loading statistics…</p> }
      @if (error()) { <p class="mt-6 text-red-700" role="alert">Unable to load statistics. <button (click)="load()" class="underline">Retry</button></p> }
      @if (stats(); as stats) {
        <section class="mt-7 grid gap-4 md:grid-cols-4">
          @for (metric of [
            { label: 'Users', value: stats.totalUsers },
            { label: 'Job seekers', value: stats.totalJobSeekers },
            { label: 'Employers', value: stats.totalEmployers },
            { label: 'Jobs', value: stats.totalJobs },
            { label: 'Applications', value: stats.totalApplications },
            { label: 'New users', value: stats.newUsersThisMonth },
            { label: 'New jobs', value: stats.newJobsThisMonth },
            { label: 'Active jobs', value: stats.activeJobs },
          ]; track metric.label) {
            <article class="card-surface p-5">
              <p class="text-sm text-slate-500">{{ metric.label }}</p>
              <p class="mt-3 text-3xl font-bold">{{ metric.value }}</p>
            </article>
          }
        </section>
        <section class="mt-8 grid gap-5 lg:grid-cols-2">
          <article class="card-surface p-6">
            <h2 class="font-bold">User usage</h2>
            <p class="mt-1 text-sm text-slate-500">Current account distribution</p>
            <div class="mt-6 space-y-5">
              @for (bar of [
                { label: 'Job seekers', value: stats.totalJobSeekers, tone: 'bg-[#174ea6]' },
                { label: 'Employers', value: stats.totalEmployers, tone: 'bg-pink-600' },
                { label: 'New this month', value: stats.newUsersThisMonth, tone: 'bg-emerald-500' },
              ]; track bar.label) {
                <div>
                  <div class="flex justify-between text-sm"><span>{{ bar.label }}</span><strong>{{ bar.value }}</strong></div>
                  <div class="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full {{ bar.tone }}" [style.width.%]="percentage(bar.value, stats.totalUsers)"></div>
                  </div>
                </div>
              }
            </div>
          </article>
          <article class="card-surface p-6">
            <h2 class="font-bold">Job activity</h2>
            <p class="mt-1 text-sm text-slate-500">Published and recently created jobs</p>
            <div class="mt-6 space-y-5">
              @for (bar of [
                { label: 'Active jobs', value: stats.activeJobs, tone: 'bg-[#174ea6]' },
                { label: 'New this month', value: stats.newJobsThisMonth, tone: 'bg-pink-600' },
                { label: 'Applications', value: stats.totalApplications, tone: 'bg-emerald-500' },
              ]; track bar.label) {
                <div>
                  <div class="flex justify-between text-sm"><span>{{ bar.label }}</span><strong>{{ bar.value }}</strong></div>
                  <div class="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full {{ bar.tone }}" [style.width.%]="percentage(bar.value, max(stats.totalJobs, stats.totalApplications))"></div>
                  </div>
                </div>
              }
            </div>
          </article>
        </section>
      }
    </main>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly repository = inject(ADMIN_REPOSITORY);
  protected readonly stats = signal<AdminStats | null>(null);
  protected readonly error = signal(false);
  protected readonly loading = signal(false);
  ngOnInit(): void { void this.load(); }
  protected async load(): Promise<void> {
    this.loading.set(true); this.error.set(false);
    try { this.stats.set(await firstValueFrom(this.repository.stats())); }
    catch { this.error.set(true); this.stats.set(null); }
    finally { this.loading.set(false); }
  }

  protected percentage(value: number, total: number): number {
    return total <= 0 ? 0 : Math.max(4, Math.round(value / total * 100));
  }

  protected max(left: number, right: number): number {
    return Math.max(left, right);
  }
}
