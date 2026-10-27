import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnalyticsFilters } from '../../../domain/analytics.model';
import { analyticsDefaults, analyticsFilterError } from '../../../domain/analytics.rules';
import { AnalyticsStore } from './analytics.store';

@Component({
  selector: 'app-hiring-analytics', standalone: true, providers: [AnalyticsStore],
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  template: `
    <main class="shell max-w-6xl py-8">
      <a routerLink="/employer/dashboard" class="text-sm font-semibold text-blue-800">← Employer dashboard</a>
      <header class="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div><p class="text-xs font-bold uppercase tracking-widest text-blue-700">Understand your hiring pipeline</p><h1 class="mt-2 text-3xl font-bold">Hiring analytics</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Follow applications from submission to recorded hiring outcomes. Choose a submission period to see how that group has progressed.</p></div>
        <span class="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-900">Private employer report · UTC</span>
      </header>
      <form class="card-surface mt-6 p-5 sm:p-6" (ngSubmit)="apply()">
        <div class="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_auto]">
          <label class="grid min-w-0 gap-2 text-sm font-semibold" for="analytics-from">Submitted from<input id="analytics-from" name="from" type="date" required [max]="today" class="min-h-11 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" [ngModel]="filters().from" (ngModelChange)="edit({ from: $event })" /></label>
          <label class="grid min-w-0 gap-2 text-sm font-semibold" for="analytics-to">Submitted through<input id="analytics-to" name="to" type="date" required [max]="today" class="min-h-11 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" [ngModel]="filters().to" (ngModelChange)="edit({ to: $event })" /></label>
          <label class="grid min-w-0 gap-2 text-sm font-semibold" for="analytics-job">Job<select id="analytics-job" name="jobId" class="min-h-11 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" [ngModel]="filters().jobId" (ngModelChange)="edit({ jobId: $event })">
            <option value="">All your jobs</option>
            @if (unknownJob()) { <option [value]="filters().jobId">Selected job</option> }
            @for (job of store.jobs(); track job.id) { <option [value]="job.id">{{ job.title }}</option> }
          </select></label>
          <button type="submit" class="min-h-11 rounded-lg bg-blue-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-50" [disabled]="store.loading()">Apply filters</button>
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3"><p class="text-xs leading-5 text-slate-500">Inclusive UTC dates · Up to 366 days · Progress measured through the report time</p><button type="button" class="min-h-11 text-sm font-semibold text-blue-800" (click)="reset()">Last 30 days</button></div>
        @if (formError()) { <p role="alert" class="mt-3 text-sm text-red-800">{{ formError() }}</p> }
        @if (store.jobsLoading()) { <p role="status" class="mt-3 text-xs text-slate-500">Loading job choices…</p> }
        @if (store.jobsError()) { <p role="alert" class="mt-3 text-sm text-amber-900">{{ store.jobsError() }} <button type="button" class="underline" (click)="store.loadJobs()">Retry job choices</button></p> }
      </form>
      @if (store.loading()) { <p role="status" class="card-surface mt-6 p-8">Calculating hiring analytics…</p> }
      @else if (store.error()) { <section role="alert" class="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"><h2 class="font-bold">Report unavailable</h2><p class="mt-2 text-sm">{{ store.error() }}</p><button type="button" class="mt-4 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" (click)="retry()">Retry report</button></section> }
      @else if (store.report(); as report) {
        <div class="mt-6 flex flex-wrap justify-between gap-2 text-xs leading-5 text-slate-500"><p>Applications submitted {{ report.from }} – {{ report.to }} · {{ report.jobId ? 'Selected job' : 'All your jobs' }}</p><p>Report time: {{ report.asOf | date:'medium':'UTC' }} UTC</p></div>
        @if (report.applications === 0) { <section class="card-surface mt-6 p-8 text-center"><h2 class="text-xl font-bold">No applications in this period</h2><p class="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">Choose a different submission period or job. Conversion and hiring time stay unavailable until there is enough recorded data.</p><a routerLink="/employer/manage-jobs" class="mt-4 inline-block text-sm font-semibold text-blue-800">Manage your jobs →</a></section> }
        <section aria-label="Hiring metrics" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article class="card-surface p-5"><h2 class="text-sm font-semibold text-slate-500">Applications</h2><p data-testid="analytics-applications" class="mt-3 text-3xl font-bold">{{ report.applications | number }}</p><p class="mt-2 text-xs text-slate-500">Submitted in the selected period</p></article>
          <article class="card-surface p-5"><h2 class="text-sm font-semibold text-slate-500">Recorded hire conversion</h2><p data-testid="analytics-conversion" class="mt-3 text-3xl font-bold">{{ report.funnel[2].conversionPercent === null ? '—' : (report.funnel[2].conversionPercent | number:'1.0-2') + '%' }}</p><p class="mt-2 text-xs text-slate-500">{{ report.funnel[2].applications }} recorded hires / {{ report.applications }} applications</p></article>
          <article class="card-surface p-5"><h2 class="text-sm font-semibold text-slate-500">Median time to hire</h2><p data-testid="analytics-median" class="mt-3 text-3xl font-bold">{{ report.timeToHire.medianDays === null ? '—' : (report.timeToHire.medianDays | number:'1.0-2') + ' days' }}</p><p class="mt-2 text-xs text-slate-500">Submission to first recorded hire</p></article>
          <article class="card-surface p-5"><h2 class="text-sm font-semibold text-slate-500">Average time to hire</h2><p class="mt-3 text-3xl font-bold">{{ report.timeToHire.averageDays === null ? '—' : (report.timeToHire.averageDays | number:'1.0-2') + ' days' }}</p><p class="mt-2 text-xs text-slate-500">{{ report.timeToHire.sampleSize }} timestamped hires in the sample</p></article>
        </section>
        <div class="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section aria-label="Recorded application funnel" class="card-surface min-w-0 p-5 sm:p-6"><h2 class="text-lg font-bold">Recorded application funnel</h2><p class="mt-2 text-sm leading-6 text-slate-500">Each stage counts distinct applications. Percentages use all applications in this period as the denominator; stages are not added together.</p>
            <ol class="mt-6 space-y-6">@for (stage of report.funnel; track stage.status) {
              <li><div class="flex flex-wrap justify-between gap-2 text-sm"><span class="font-semibold">{{ labels[stage.status] }}</span><span>{{ stage.applications | number }} · {{ stage.conversionPercent === null ? 'Not available' : (stage.conversionPercent | number:'1.0-2') + '%' }}</span></div><div aria-hidden="true" class="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-blue-700" [style.width.%]="stage.conversionPercent ?? 0"></div></div></li>
            }</ol>
            <p class="mt-6 border-t pt-4 text-xs leading-5 text-slate-500">Review and hire stages use recorded status events. Rejections can happen before or after review. Incomplete older histories can make this funnel incomplete.</p>
          </section>
          <section aria-label="Current application statuses" class="card-surface min-w-0 p-5 sm:p-6"><h2 class="text-lg font-bold">Where applications are now</h2><p class="mt-2 text-sm leading-6 text-slate-500">Current statuses for this same submission group, including applications with incomplete history.</p><dl class="mt-5 divide-y divide-slate-100">@for (status of report.currentStatuses; track status.status) { <div class="flex justify-between gap-3 py-4 text-sm"><dt>{{ statusLabels[status.status] }}</dt><dd class="font-bold">{{ status.applications | number }}</dd></div> }</dl></section>
        </div>
        @if (report.applicationsWithoutSubmissionHistory || report.timeToHire.hiredWithoutTimestamp) {
          <section class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950" aria-label="Data completeness"><h2 class="font-bold">Some historical data is incomplete</h2><p class="mt-2 text-sm leading-6">{{ report.applicationsWithoutSubmissionHistory }} applications have no recorded submission event. {{ report.timeToHire.hiredWithoutTimestamp }} currently hired applications have no usable hire timestamp. Missing timestamps are excluded from hiring-time calculations, never counted as zero days.</p></section>
        }
        <section class="mt-6 rounded-xl bg-slate-50 p-5 text-sm leading-6 text-slate-600"><h2 class="font-bold text-slate-800">How to read this report</h2><p class="mt-2">Dates select when applications were submitted, not when candidates were hired. Later progress is included through the report time. Time to hire is elapsed 24-hour days; it is not time since the job was posted. Only recorded hires contribute to the average and median, so recent application groups may still be progressing.</p></section>
      }
    </main>
  `,
})
export class AnalyticsComponent {
  protected readonly store = inject(AnalyticsStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly filters = signal<AnalyticsFilters>(analyticsDefaults());
  protected readonly formError = signal('');
  private appliedFilters = analyticsDefaults();
  protected readonly labels = { SUBMITTED: 'Submitted', REVIEWING: 'Recorded review', HIRED: 'Recorded hire' };
  protected readonly statusLabels = { SUBMITTED: 'Awaiting review', REVIEWING: 'In review', HIRED: 'Hired', REJECTED: 'Rejected' };
  protected readonly unknownJob = computed(() => !!this.filters().jobId && !this.store.jobs().some(job => job.id === this.filters().jobId));
  constructor() {
    void this.store.loadJobs();
    effect(() => {
      const params = this.params();
      const end = new Date((params.get('to') ?? this.today) + 'T00:00:00Z');
      const defaults = Number.isFinite(end.getTime()) ? analyticsDefaults(end) : analyticsDefaults();
      const filters = { from: params.get('from') ?? defaults.from, to: params.get('to') ?? defaults.to, jobId: params.get('jobId') ?? '' };
      this.appliedFilters = filters;
      this.filters.set(filters); this.formError.set(''); untracked(() => void this.store.load(filters));
    });
  }
  protected edit(change: Partial<AnalyticsFilters>) { this.filters.update(current => ({ ...current, ...change })); this.formError.set(''); }
  protected async apply() {
    const filters = this.filters(), error = analyticsFilterError(filters); this.formError.set(error ?? ''); if (error) return;
    const moved = await this.router.navigate([], { relativeTo: this.route, queryParams: { from: filters.from, to: filters.to, ...(filters.jobId ? { jobId: filters.jobId } : {}) } });
    if (!moved) await this.store.load(filters);
  }
  protected reset() { this.filters.set(analyticsDefaults()); void this.apply(); }
  protected retry() { void this.store.load(this.appliedFilters); }
}
