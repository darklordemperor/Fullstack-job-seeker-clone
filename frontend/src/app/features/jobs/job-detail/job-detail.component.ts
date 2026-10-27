import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap, Subject } from 'rxjs';
import { JOB_REPOSITORY } from '../../../core/di/repository.tokens';
import { Job } from '../../../domain/job.model';
import { SalaryRangePipe } from '../../../shared/pipes/salary-range.pipe';
import { JobActionsComponent } from '../job-actions.component';

interface DetailState { job: Job | null; loading: boolean; error: string }
@Component({
  selector: 'app-job-detail', standalone: true, imports: [SalaryRangePipe, JobActionsComponent, RouterLink],
  template: `
    <main class="shell max-w-3xl py-8">
      <a routerLink="/jobs" class="text-sm font-semibold text-blue-800">← Browse jobs</a>
      @if (state().loading) { <p role="status" class="mt-8">Loading job…</p> }
      @else if (state().error) {
        <section class="card-surface mt-6 p-8" role="alert"><h1 class="text-xl font-bold">{{ state().error }}</h1>
          <button class="mt-5 rounded border px-5 py-2" (click)="retry.next()">Try again</button></section>
      } @else if (state().job; as job) {
        <article class="card-surface mt-6 overflow-hidden">
          <header class="bg-blue-50 p-7"><p class="font-semibold text-blue-800">{{ job.companyName }}</p>
            <h1 class="mt-3 text-3xl font-bold">{{ job.title }}</h1><p class="mt-3 text-sm text-slate-600">{{ job.location }}</p>
            <p class="mt-2 text-sm font-semibold">{{ { min: job.salaryMin, max: job.salaryMax, currency: job.salaryCurrency ?? 'THB' } | salaryRange }}</p></header>
          <section class="p-7"><app-job-actions [jobId]="job.id" /><h2 class="mt-8 text-lg font-bold">About this opportunity</h2>
            <p class="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{{ job.description }}</p></section>
        </article>
      }
    </main>`,
})
export class JobDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly jobs = inject(JOB_REPOSITORY);
  protected readonly retry = new Subject<void>();
  protected readonly state = toSignal(this.route.paramMap.pipe(
    switchMap(params => this.retry.pipe(startWith(undefined), switchMap(() => this.jobs.findById(params.get('id') ?? '').pipe(
      map(job => ({ job, loading: false, error: '' })),
      catchError((error: HttpErrorResponse) => of({ job: null, loading: false, error: error.status === 404 ? 'This job is no longer available' : 'Unable to load this job' })),
      startWith({ job: null, loading: true, error: '' } as DetailState),
    )))),
  ), { initialValue: { job: null, loading: true, error: '' } as DetailState });
}
