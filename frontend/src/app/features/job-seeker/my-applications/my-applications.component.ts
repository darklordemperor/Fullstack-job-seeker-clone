import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { JobSeekerRepository } from '../../../data/job-seeker.repository';

@Component({
  selector: 'app-my-applications',
  standalone: true,
  template: `
    <main class="shell max-w-4xl py-8">
      <h1 class="text-2xl font-bold">My applications</h1>
      <div class="mt-6 grid gap-4">
        @for (application of applications(); track application.id) {
          <article class="card-surface p-5">
            <h2 class="font-bold">{{ application.jobTitle }}</h2>
            <p class="mt-1 text-sm text-slate-600">{{ application.companyName }}</p>
            <span class="mt-4 inline-flex rounded bg-blue-50 px-3 py-2 text-xs font-semibold text-[#1C3F6E]">{{ application.status }}</span>
          </article>
        }
      </div>
    </main>
  `,
})
export class MyApplicationsComponent {
  private readonly repository = inject(JobSeekerRepository);
  protected readonly applications = toSignal(this.repository.myApplications(), { initialValue: [] });
}
