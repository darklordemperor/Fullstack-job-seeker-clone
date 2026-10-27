import { Component, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { JobFilter } from '../../../domain/job.model';
import { JobActionsComponent } from '../job-actions.component';
import { ShellUiService } from '../../../core/layout/shell-ui.service';
import { SalaryRangePipe } from '../../../shared/pipes/salary-range.pipe';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { JobFilterComponent } from './job-filter/job-filter.component';
import { JobListStore } from './job-list.store';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [JobFilterComponent, PaginationComponent, SalaryRangePipe, SkeletonComponent, TimeAgoPipe, JobActionsComponent, RouterLink],
  providers: [JobListStore],
  template: `
    <app-job-filter [filters]="store.filters()" (search)="search($event)" />
    <main class="shell grid items-start gap-7 py-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <span class="rounded-full border border-[#174ea6] px-4 py-2 text-sm font-semibold text-[#174ea6]">All jobs</span>
          <span class="text-xs font-semibold text-slate-500">{{ store.totalElements() }} opportunities</span>
        </div>
        <article class="card-surface p-4">
          @if(auth.isJobSeeker()) {
            <a routerLink="/job-seeker/saved-searches" [queryParams]="{q:store.filters().q,location:store.filters().location}" class="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-blue-800 underline">Save this search & create alerts</a>
          }
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-bold">Make your next application count</p>
              <p class="mt-1 text-xs leading-5 text-slate-500">Update your profile before applying. Employers receive the details you submit.</p>
            </div>
          </div>
        </article>
        @if (store.loading()) {
          <p role="status" class="text-sm text-slate-600">Loading jobs…</p>
          @for (row of [1, 2, 3]; track row) {
            <div class="card-surface p-4"><app-skeleton [height]="150" /></div>
          }
        } @else if (store.error()) {
          <div role="alert" class="card-surface border-red-200 p-5 text-red-800">Unable to load jobs. <button class="underline" (click)="store.loadData(store.filters())">Retry</button></div>
        } @else {
          @for (job of store.jobs(); track job.id) {
            <article
              class="card-surface cursor-pointer p-4 transition hover:border-[#174ea6] hover:shadow-md"
              [class.border-[#174ea6]]="store.selected()?.id === job.id"
              [class.ring-1]="store.selected()?.id === job.id"
              [class.ring-[#174ea6]]="store.selected()?.id === job.id"
              (click)="store.select(job)"
              tabindex="0" (keydown.enter)="store.select(job)"
            >
              <div class="flex justify-between gap-4">
                <div>
                  <h2 class="text-sm font-bold leading-5 text-[#3b1b91]"><a [routerLink]="['/jobs', job.id]">{{ job.title }}</a></h2>
                  <p class="mt-1 text-xs font-semibold text-slate-800">{{ job.companyName }}</p>
                </div>
                <div class="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-emerald-50 text-sm font-black text-emerald-700">{{ job.companyName?.slice(0, 3) }}</div>
              </div>
              <span class="mt-3 inline-flex rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Actively hiring</span>
              <p class="mt-3 text-xs text-slate-600">{{ job.location }}</p>
              <p class="mt-2 text-xs font-semibold text-slate-700">{{ { min: job.salaryMin, max: job.salaryMax, currency: job.salaryCurrency ?? 'THB' } | salaryRange }}</p>
              <p class="mt-3 line-clamp-3 text-xs leading-5 text-slate-600">{{ job.description }}</p>
              <div class="mt-4 flex justify-between text-xs text-slate-500">
                <span>{{ job.createdAt | timeAgo }}</span>
                <a [routerLink]="['/jobs', job.id]" class="font-semibold text-blue-800">View job →</a>
              </div>
            </article>
          } @empty {
            <article class="card-surface p-6 text-center">
              <h2 class="font-bold">No matching jobs found</h2>
              <p class="mt-2 text-sm text-slate-500">Try a broader keyword or another location.</p>
            </article>
          }
        }
        <app-pagination [page]="store.page()" [totalPages]="store.totalPages()" (pageChange)="changePage($event)" />
      </section>

      @if (store.selected(); as job) {
        <section class="sticky hidden overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm lg:block" [style.top.px]="shell.detailTop()" [style.max-height]="'calc(100vh - ' + (shell.detailTop() + 16) + 'px)'">
          <article class="p-7">
            <div class="flex items-start justify-between gap-4">
              <div class="grid h-14 w-28 place-items-center rounded-md bg-emerald-50 text-2xl font-black text-emerald-700">{{ job.companyName?.slice(0, 4) }}</div>
            </div>
            <span class="mt-5 inline-flex rounded bg-fuchsia-50 px-2 py-1 text-[10px] font-bold text-fuchsia-700">Open opportunity</span>
            <h1 class="mt-3 max-w-2xl text-xl font-bold leading-snug">{{ job.title }}</h1>
            <p class="mt-1 text-sm font-semibold text-slate-700">{{ job.companyName }}</p>
            <div class="mt-5 grid gap-3 border-b border-slate-100 pb-5 text-sm text-slate-600">
              <span>⌖ {{ job.location }}</span>
              <span>▤ {{ { min: job.salaryMin, max: job.salaryMax, currency: job.salaryCurrency ?? 'THB' } | salaryRange }}</span>
            </div>
            <div class="mt-5"><app-job-actions [jobId]="job.id" /></div>
          </article>
          <section class="p-7 text-sm leading-6 text-slate-700">
            <h2 class="text-lg font-bold text-slate-900">About the role</h2>
            <p class="mt-3 whitespace-pre-line">{{ job.description }}</p>
          </section>
        </section>
      }
    </main>
  `,
})
export class JobListComponent {
  protected readonly auth=inject(AuthStore);
  protected readonly store = inject(JobListStore);
  protected readonly shell = inject(ShellUiService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.queryParamMap);
  constructor() {
    effect(() => {
      const params = this.params();
      const page = Number(params?.get('page') ?? 0);
      const filters = { q: params?.get('q') ?? '', location: params?.get('location') ?? '', page: Number.isInteger(page) && page >= 0 ? page : 0, size: 8 };
      untracked(() => this.store.loadData(filters));
    });
  }
  protected search(filters: JobFilter): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { q: filters.q || null, location: filters.location || null, page: filters.page || null } });
  }
  protected changePage(page: number): void { this.search({ ...this.store.filters(), page }); }
}
