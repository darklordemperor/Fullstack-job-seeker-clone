import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { JobSeekerRepository } from '../../../data/job-seeker.repository';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';

@Component({
  selector: 'app-my-applications',
  standalone: true,
  imports: [PaginationComponent],
  template: `
    <main class="shell max-w-4xl py-8">
      <h1 class="text-2xl font-bold">My applications</h1>
      <p class="mt-2 text-sm text-slate-600">Track each application and its current hiring status.</p>
      <div class="mt-6 grid gap-4">
        @for (application of pagedApplications(); track application.id) {
          <article class="card-surface p-5">
            <h2 class="font-bold">{{ application.jobTitle }}</h2>
            <p class="mt-1 text-sm text-slate-600">{{ application.companyName }}</p>
            <span class="mt-4 inline-flex rounded bg-blue-50 px-3 py-2 text-xs font-semibold text-[#1C3F6E]">{{ application.status }}</span>
          </article>
        }
      </div>
      <div class="mt-5">
        <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="page.set($event)" />
      </div>
    </main>
  `,
})
export class MyApplicationsComponent {
  private readonly repository = inject(JobSeekerRepository);
  private readonly applications = toSignal(this.repository.myApplications(), { initialValue: [] });
  protected readonly page = signal(0);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.applications().length / 8)));
  protected readonly pagedApplications = computed(() => this.applications().slice(this.page() * 8, this.page() * 8 + 8));
}
