import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EMPLOYER_REPOSITORY } from '../../../core/di/repository.tokens';
import { EmployerStats } from '../../../domain/hiring.model';
import { Job } from '../../../domain/job.model';

@Component({
  selector: 'app-employer-dashboard', standalone: true, imports: [RouterLink],
  template: `
    <main class="shell py-8">
      <div class="flex flex-wrap items-center justify-between gap-5">
        <div><p class="text-sm font-semibold text-blue-700">Hiring overview</p><h1 class="mt-1 text-3xl font-bold">Employer dashboard</h1></div>
        <a routerLink="/employer/post-job" class="rounded bg-pink-600 px-6 py-3 font-bold text-white">Post a job</a>
      </div>
      <a routerLink="/employer/interviews" class="mt-5 inline-block rounded-lg border px-4 py-3 text-sm font-bold">Upcoming interviews →</a>
      <a routerLink="/employer/analytics" class="ml-0 mt-5 inline-block rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 sm:ml-3">Hiring analytics →</a>
      @if (error()) { <p role="alert" class="mt-6 rounded bg-red-50 p-4 text-red-800">{{ error() }} <button class="underline" (click)="load()">Retry</button></p> }
      @if (loading()) { <p role="status" class="mt-6">Loading your hiring overview…</p> }
      @else if (stats()) {
        <section class="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (metric of metrics(); track metric.label) { <article class="card-surface p-5"><p class="text-sm text-slate-500">{{ metric.label }}</p><p class="mt-3 text-3xl font-bold">{{ metric.value }}</p></article> }
        </section>
        <section class="card-surface mt-8 p-6"><div class="flex items-center justify-between gap-3"><h2 class="font-bold">Recent jobs</h2><a routerLink="/employer/manage-jobs" class="text-sm font-semibold text-blue-800">Manage all jobs →</a></div>
          @for (job of jobs(); track job.id) { <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div><p class="font-semibold">{{ job.title }}</p><p class="mt-1 text-xs text-slate-500">{{ job.status }} · {{ job.applicants }} applicants</p></div><a [routerLink]="['/employer/applicants',job.id]" class="text-sm font-semibold text-blue-800">Review applicants</a></div> }
          @empty { <p class="mt-5 text-sm text-slate-500">Create your first job to start receiving applications.</p> }
        </section>
      }
    </main>`,
})
export class EmployerDashboardComponent implements OnInit {
  private readonly repo = inject(EMPLOYER_REPOSITORY);
  protected readonly stats = signal<EmployerStats | null>(null);
  protected readonly jobs = signal<Job[]>([]);
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly metrics = computed(() => [
    { label: 'Open jobs', value: this.stats()?.openJobs ?? 0 },
    { label: 'Applications', value: this.stats()?.applicants ?? 0 },
    { label: 'In review', value: this.stats()?.reviewing ?? 0 },
    { label: 'Hired', value: this.stats()?.hired ?? 0 },
  ]);
  ngOnInit(): void { void this.load(); }
  protected async load(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try { const [stats, jobs] = await Promise.all([firstValueFrom(this.repo.stats()), firstValueFrom(this.repo.jobs())]); this.stats.set(stats); this.jobs.set(jobs.slice(0, 5)); }
    catch { this.error.set('Unable to load your hiring overview.'); }
    finally { this.loading.set(false); }
  }
}
