import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EmployerRepository } from '../../../data/employer.repository';

@Component({
  selector: 'app-manage-jobs',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="shell py-8">
      <h1 class="text-2xl font-bold">Manage jobs</h1>
      <div class="mt-6 grid gap-4">
        @for (job of jobs(); track job.id) {
          <article class="card-surface flex items-center justify-between p-5">
            <div>
              <h2 class="font-bold">{{ job.title }}</h2>
              <p class="mt-1 text-sm text-slate-600">{{ job.applicants }} applicants · {{ job.status }}</p>
            </div>
            <a [routerLink]="['/employer/applicants', job.id]" class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold">Applicants</a>
          </article>
        }
      </div>
    </main>
  `,
})
export class ManageJobsComponent {
  private readonly repository = inject(EmployerRepository);
  protected readonly jobs = toSignal(this.repository.jobs(), { initialValue: [] });
}
