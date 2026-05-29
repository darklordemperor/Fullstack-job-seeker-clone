import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EmployerRepository } from '../../../data/employer.repository';

@Component({
  selector: 'app-employer-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="shell py-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Employer dashboard</h1>
          <p class="mt-2 text-sm text-slate-600">Manage job posts and review incoming applicants.</p>
        </div>
        <a routerLink="/employer/post-job" class="rounded-md bg-pink-600 px-5 py-3 text-sm font-bold text-white">Post job</a>
      </div>
      <section class="mt-7 grid gap-4 md:grid-cols-3">
        @for (metric of metrics; track metric.label) {
          <article class="card-surface p-5">
            <p class="text-sm text-slate-500">{{ metric.label }}</p>
            <p class="mt-3 text-3xl font-bold">{{ metric.value }}</p>
          </article>
        }
      </section>
      <section class="mt-8 card-surface p-5">
        <h2 class="font-bold">Recent jobs</h2>
        <div class="mt-4 grid gap-3">
          @for (job of jobs(); track job.id) {
            <div class="flex items-center justify-between border-t border-slate-100 pt-3">
              <span class="font-semibold">{{ job.title }}</span>
              <span class="text-sm text-slate-500">{{ job.status }}</span>
            </div>
          }
        </div>
      </section>
    </main>
  `,
})
export class EmployerDashboardComponent {
  private readonly repository = inject(EmployerRepository);
  protected readonly jobs = toSignal(this.repository.jobs(), { initialValue: [] });
  protected readonly metrics = [
    { label: 'Open jobs', value: 3 },
    { label: 'Applicants', value: 74 },
    { label: 'Profile views', value: 128 },
  ];
}
