import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Job } from '../../../domain/job.model';
import { SalaryRangePipe } from '../../../shared/pipes/salary-range.pipe';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { JobFilterComponent } from './job-filter/job-filter.component';
import { JobListStore } from './job-list.store';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [JobFilterComponent, RouterLink, SalaryRangePipe, SkeletonComponent, TimeAgoPipe],
  providers: [JobListStore],
  template: `
    <app-job-filter (search)="store.loadData($event)" />
    <main class="shell grid gap-8 py-7 lg:grid-cols-[360px_1fr_140px]">
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="rounded-full border border-[#1C3F6E] px-4 py-2 text-sm font-semibold text-[#1C3F6E]">All jobs</span>
          <span class="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">99+</span>
        </div>
        @if (store.loading()) {
          @for (row of [1, 2, 3]; track row) {
            <div class="card-surface p-4"><app-skeleton [height]="150" /></div>
          }
        } @else {
          @for (job of store.jobs(); track job.id) {
            <article
              class="card-surface cursor-pointer p-4 transition hover:border-[#1C3F6E]"
              [class.border-[#1C3F6E]]="store.selected()?.id === job.id"
              (click)="store.select(job)"
            >
              <div class="flex justify-between gap-4">
                <div>
                  <h2 class="text-sm font-bold text-[#1C3F6E]">{{ job.title }}</h2>
                  <p class="mt-1 text-sm text-slate-800">{{ job.companyName }}</p>
                </div>
                <div class="grid h-12 w-12 place-items-center rounded bg-slate-100 text-xs font-bold text-[#1C3F6E]">co</div>
              </div>
              <p class="mt-3 text-xs text-slate-600">{{ job.location }}</p>
              <p class="mt-2 text-xs font-semibold text-slate-700">{{ { min: job.salaryMin, max: job.salaryMax, currency: job.salaryCurrency ?? 'THB' } | salaryRange }}</p>
              <p class="mt-3 line-clamp-3 text-xs leading-5 text-slate-600">{{ job.description }}</p>
              <div class="mt-4 flex justify-between text-xs text-slate-500">
                <span>{{ job.createdAt | timeAgo }}</span>
                <a [routerLink]="['/jobs', job.id]" class="font-semibold text-[#1C3F6E]">Open</a>
              </div>
            </article>
          }
        }
      </section>

      <section class="min-h-[640px]">
        @if (store.selected(); as job) {
          <article class="card-surface overflow-hidden">
            <div class="h-44 bg-[linear-gradient(135deg,#d9ecff,#ffffff)] p-6">
              <div class="grid h-full place-items-center rounded bg-white/60 text-3xl font-bold text-[#1C3F6E]">{{ job.companyName?.slice(0, 7) }}</div>
            </div>
            <div class="p-7">
              <p class="text-2xl font-bold">{{ job.companyName }}</p>
              <h1 class="mt-8 max-w-2xl text-2xl font-bold leading-snug">{{ job.title }}</h1>
              <div class="mt-6 grid gap-3 text-sm text-slate-600">
                <span>{{ job.location }}</span>
                <span>{{ job.industry }}</span>
                <span>{{ { min: job.salaryMin, max: job.salaryMax, currency: job.salaryCurrency ?? 'THB' } | salaryRange }}</span>
              </div>
              <div class="mt-6 flex gap-3">
                <button type="button" class="rounded-md bg-pink-600 px-7 py-3 text-sm font-bold text-white">Apply now</button>
                <button type="button" class="rounded-md bg-blue-50 px-7 py-3 text-sm font-bold text-[#1C3F6E]">Save</button>
              </div>
            </div>
          </article>
          <section class="card-surface mt-5 p-6">
            <h2 class="font-bold">How you match this job</h2>
            <p class="mt-2 text-sm text-slate-600">Your profile matches several skills requested by this employer.</p>
            <div class="mt-4 flex flex-wrap gap-2">
              @for (skill of ['Angular', 'TypeScript', 'Frontend Performance']; track skill) {
                <span class="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-[#1C3F6E]">{{ skill }}</span>
              }
            </div>
          </section>
        }
      </section>

      <aside class="hidden bg-pink-600 px-5 py-20 text-center text-xl font-bold leading-snug text-white lg:block">
        Verify your profile and get discovered
      </aside>
    </main>
  `,
})
export class JobListComponent implements OnInit {
  protected readonly store = inject(JobListStore);

  ngOnInit(): void {
    this.store.loadData({ page: 0, size: 20 });
  }
}
