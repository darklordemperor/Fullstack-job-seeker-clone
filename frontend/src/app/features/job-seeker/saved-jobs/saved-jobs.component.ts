import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { SavedJobsStore } from './saved-jobs.store';

@Component({
  selector: 'app-saved-jobs', standalone: true,
  imports: [RouterLink, DatePipe, PaginationComponent], providers: [SavedJobsStore],
  styles: [`a { color: #174ea6; } a.primary-action { color: #fff; }`],
  template: `
    <main class="shell max-w-5xl py-8 sm:py-12">
      <header class="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div><p class="text-xs font-bold uppercase tracking-wider text-[#174ea6]">Your next opportunity</p>
          <h1 class="mt-2 text-3xl font-bold">Saved jobs</h1>
          <p class="mt-3 text-sm text-slate-600">Keep your shortlist together and apply when you are ready.</p>
        </div>
        <a routerLink="/jobs" class="rounded-lg border border-[#174ea6] px-4 py-3 text-sm font-bold text-[#174ea6]">Find more jobs</a>
      </header>
      @if (store.removalError()) { <p role="alert" class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{{ store.removalError() }}</p> }
      @if (store.loading()) {
        <div role="status" class="card-surface p-10 text-center text-slate-600">Loading saved jobs…</div>
      } @else if (store.error()) {
        <section role="alert" class="card-surface p-8 text-center">
          <p class="text-red-800">{{ store.error() }}</p>
          <button type="button" class="mt-4 rounded-lg border px-5 py-3 font-semibold text-[#174ea6]" (click)="store.load()">Retry</button>
        </section>
      } @else if (store.jobs().length) {
        <p class="mb-4 text-sm text-slate-600">{{ store.total() }} saved {{ store.total() === 1 ? 'job' : 'jobs' }}</p>
        <div class="grid gap-4">
          @for (job of store.jobs(); track job.jobId) {
            <article class="card-surface flex min-w-0 flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div class="min-w-0 flex-1 break-words">
                <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                  [class]="job.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'">
                  {{ job.status === 'ACTIVE' ? 'Accepting applications' : job.status === 'CLOSED' ? 'Closed' : 'Unavailable' }}
                </span>
                <h2 class="mt-3 text-lg font-bold">{{ job.title }}</h2>
                <p class="mt-1 text-sm text-slate-600">{{ job.companyName }}{{ job.location ? ' · ' + job.location : '' }}</p>
                <p class="mt-2 text-xs text-slate-500">Saved {{ job.savedAt | date:'mediumDate' }}</p>
              </div>
              <div class="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                @if (job.status === 'ACTIVE') {
                  <a [routerLink]="['/jobs', job.jobId]" class="primary-action rounded-lg bg-[#174ea6] px-5 py-3 text-center text-sm font-bold text-white">View job</a>
                }
                <button type="button" [disabled]="!!store.removing()" [attr.aria-label]="'Remove ' + job.title"
                  class="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 disabled:opacity-50" (click)="store.remove(job.jobId)">
                  {{ store.removing() === job.jobId ? 'Removing…' : 'Remove' }}
                </button>
              </div>
            </article>
          }
        </div>
        @if (!store.removing()) {
          <div class="mt-6"><app-pagination [page]="store.page()" [totalPages]="store.totalPages()" (pageChange)="store.load($event)" /></div>
        }
      } @else {
        <section class="card-surface px-6 py-14 text-center">
          <div aria-hidden="true" class="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-2xl text-[#174ea6]">☆</div>
          <h2 class="text-xl font-bold">Start your shortlist</h2>
          <p class="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">Save jobs while browsing, then compare your opportunities here.</p>
          <a routerLink="/jobs" class="primary-action mt-6 inline-block rounded-lg bg-[#174ea6] px-6 py-3 text-sm font-bold text-white">Explore jobs</a>
        </section>
      }
    </main>
  `,
})
export class SavedJobsComponent implements OnInit {
  protected readonly store = inject(SavedJobsStore);
  ngOnInit(): void { void this.store.load(0); }
}
