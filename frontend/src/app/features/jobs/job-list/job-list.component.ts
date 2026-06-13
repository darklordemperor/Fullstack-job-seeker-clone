import { Component, inject, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { JobSeekerRepository } from '../../../data/job-seeker.repository';
import { AuthStore } from '../../../core/auth/auth.store';
import { ShellUiService } from '../../../core/layout/shell-ui.service';
import { SalaryRangePipe } from '../../../shared/pipes/salary-range.pipe';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { JobFilterComponent } from './job-filter/job-filter.component';
import { JobListStore } from './job-list.store';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [JobFilterComponent, PaginationComponent, SalaryRangePipe, SkeletonComponent, TimeAgoPipe],
  providers: [JobListStore],
  template: `
    <app-job-filter (search)="store.loadData($event)" />
    <main class="shell grid items-start gap-7 py-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <span class="rounded-full border border-[#174ea6] px-4 py-2 text-sm font-semibold text-[#174ea6]">All jobs</span>
          <span class="text-xs font-semibold text-slate-500">{{ store.totalElements() }} opportunities</span>
        </div>
        <article class="card-surface p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-bold">Higher opportunity jobs</p>
              <p class="mt-1 text-xs leading-5 text-slate-500">Complete your profile so employers can discover you.</p>
            </div>
            <span class="h-5 w-9 rounded-full bg-slate-200 p-0.5"><span class="block h-4 w-4 rounded-full bg-white shadow"></span></span>
          </div>
        </article>
        @if (store.loading()) {
          @for (row of [1, 2, 3]; track row) {
            <div class="card-surface p-4"><app-skeleton [height]="150" /></div>
          }
        } @else {
          @for (job of store.jobs(); track job.id) {
            <article
              class="card-surface cursor-pointer p-4 transition hover:border-[#174ea6] hover:shadow-md"
              [class.border-[#174ea6]]="store.selected()?.id === job.id"
              [class.ring-1]="store.selected()?.id === job.id"
              [class.ring-[#174ea6]]="store.selected()?.id === job.id"
              (click)="store.select(job)"
            >
              <div class="flex justify-between gap-4">
                <div>
                  <h2 class="text-sm font-bold leading-5 text-[#3b1b91]">{{ job.title }}</h2>
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
                <span aria-label="Save job">♡</span>
              </div>
            </article>
          } @empty {
            <article class="card-surface p-6 text-center">
              <h2 class="font-bold">No matching jobs found</h2>
              <p class="mt-2 text-sm text-slate-500">Try a broader keyword or another location.</p>
            </article>
          }
        }
        <app-pagination [page]="store.page()" [totalPages]="store.totalPages()" (pageChange)="store.loadPage($event)" />
      </section>

      @if (store.selected(); as job) {
        <section class="sticky hidden overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm lg:block" [style.top.px]="shell.detailTop()" [style.max-height]="'calc(100vh - ' + (shell.detailTop() + 16) + 'px)'">
          <article class="p-7">
            <div class="flex items-start justify-between gap-4">
              <div class="grid h-14 w-28 place-items-center rounded-md bg-emerald-50 text-2xl font-black text-emerald-700">{{ job.companyName?.slice(0, 4) }}</div>
              <div class="text-lg text-slate-400">↗ &nbsp; ⋮</div>
            </div>
            <span class="mt-5 inline-flex rounded bg-fuchsia-50 px-2 py-1 text-[10px] font-bold text-fuchsia-700">Recommended job</span>
            <h1 class="mt-3 max-w-2xl text-xl font-bold leading-snug">{{ job.title }}</h1>
            <p class="mt-1 text-sm font-semibold text-slate-700">{{ job.companyName }}</p>
            <div class="mt-5 grid gap-3 border-b border-slate-100 pb-5 text-sm text-slate-600">
              <span>⌖ {{ job.location }}</span>
              <span>▣ {{ job.industry }}</span>
              <span>◷ Full time</span>
              <span>▤ {{ { min: job.salaryMin, max: job.salaryMax, currency: job.salaryCurrency ?? 'THB' } | salaryRange }}</span>
            </div>
            <div class="mt-5 flex gap-3">
              @if (auth.isJobSeeker()) {
                <button type="button" class="rounded-md bg-pink-600 px-7 py-3 text-sm font-bold text-white" (click)="apply(job.id)">Apply now</button>
              } @else {
                <span class="rounded-md bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600">Job seeker account required to apply</span>
              }
              <button type="button" class="rounded-md bg-blue-50 px-7 py-3 text-sm font-bold text-[#174ea6]" (click)="saved.set(!saved())">{{ saved() ? 'Saved' : 'Save' }}</button>
            </div>
          </article>
          <section class="mx-7 rounded-lg border border-slate-200 p-5">
            <h2 class="font-bold">How you match this job</h2>
            <p class="mt-2 text-xs leading-5 text-slate-600">Your profile already includes several skills requested by this employer.</p>
            <div class="mt-4 flex flex-wrap gap-2">
              @for (skill of ['Communication', 'Growth strategy', 'Teamwork']; track skill) {
                <span class="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-[#174ea6]">{{ skill }}</span>
              }
            </div>
          </section>
          <section class="p-7 text-sm leading-6 text-slate-700">
            <h2 class="text-lg font-bold text-slate-900">About the role</h2>
            <p class="mt-3">{{ job.description }}</p>
            <h3 class="mt-6 font-bold text-slate-900">Key responsibilities</h3>
            <ul class="mt-2 list-disc space-y-2 pl-5">
              <li>Own plans and priorities across the role's main business area.</li>
              <li>Collaborate with stakeholders and turn customer insight into action.</li>
              <li>Track results, improve the process, and communicate progress clearly.</li>
              <li>Support a high-quality experience for customers and colleagues.</li>
            </ul>
            <h3 class="mt-6 font-bold text-slate-900">What you will bring</h3>
            <ul class="mt-2 list-disc space-y-2 pl-5">
              <li>Strong communication skills and practical ownership.</li>
              <li>Experience working in a fast-paced cross-functional team.</li>
              <li>A thoughtful, detail-oriented approach to delivery.</li>
            </ul>
          </section>
        </section>
      }
    </main>
  `,
})
export class JobListComponent implements OnInit {
  protected readonly store = inject(JobListStore);
  protected readonly saved = signal(false);
  protected readonly shell = inject(ShellUiService);
  protected readonly auth = inject(AuthStore);
  private readonly jobSeeker = inject(JobSeekerRepository);
  private readonly toast = inject(ToastService);

  ngOnInit(): void {
    this.store.loadData({ page: 0, size: 8 });
  }

  protected async apply(jobId: string): Promise<void> {
    await firstValueFrom(this.jobSeeker.apply(jobId));
    this.toast.success('Application submitted');
  }
}
