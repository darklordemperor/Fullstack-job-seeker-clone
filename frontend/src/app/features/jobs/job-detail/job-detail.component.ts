import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { JobRepository } from '../../../data/job.repository';
import { SalaryRangePipe } from '../../../shared/pipes/salary-range.pipe';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [SalaryRangePipe, SkeletonComponent],
  template: `
    <main class="shell max-w-3xl py-7">
      @if (job(); as job) {
        <section class="h-56 overflow-hidden rounded-lg bg-slate-100">
          <div class="grid h-full place-items-center bg-[linear-gradient(120deg,#dbeafe,#ffffff)] text-4xl font-bold text-[#1C3F6E]">{{ job.companyName }}</div>
        </section>
        <section class="py-8">
          <p class="text-3xl font-bold">{{ job.companyName }}</p>
          <h1 class="mt-8 text-3xl font-bold">{{ job.title }}</h1>
          <div class="mt-5 grid gap-3 text-sm text-slate-600">
            <span>{{ job.location }}</span>
            <span>{{ job.industry }}</span>
            <span>{{ { min: job.salaryMin, max: job.salaryMax, currency: job.salaryCurrency ?? 'THB' } | salaryRange }}</span>
          </div>
          <div class="mt-7 flex gap-3">
            <button type="button" class="rounded-md bg-pink-600 px-7 py-3 text-sm font-bold text-white">Apply now</button>
            <button type="button" class="rounded-md bg-blue-50 px-7 py-3 text-sm font-bold text-[#1C3F6E]">Save</button>
          </div>
          <article class="prose mt-10 max-w-none text-slate-700">
            <h2 class="text-base font-bold">Role Overview</h2>
            <p>{{ job.description }}</p>
          </article>
        </section>
      } @else {
        <app-skeleton [height]="420" />
      }
    </main>
  `,
})
export class JobDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly jobs = inject(JobRepository);
  protected readonly job = toSignal(this.route.paramMap.pipe(
    map((params) => params.get('id') ?? ''),
    switchMap((id) => this.jobs.findById(id)),
  ));
}
