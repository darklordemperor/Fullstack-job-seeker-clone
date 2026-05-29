import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AdminRepository } from '../../../data/admin.repository';

@Component({
  selector: 'app-admin-applications',
  standalone: true,
  template: `
    <main class="shell py-8">
      <h1 class="text-2xl font-bold">Applications</h1>
      <section class="mt-6 card-surface divide-y divide-slate-100">
        @for (application of applications(); track application.id) {
          <div class="p-5">
            <p class="font-semibold">{{ application.jobTitle }}</p>
            <p class="mt-1 text-sm text-slate-600">{{ application.companyName }} · {{ application.status }}</p>
          </div>
        }
      </section>
    </main>
  `,
})
export class AdminApplicationsComponent {
  private readonly repository = inject(AdminRepository);
  protected readonly applications = toSignal(this.repository.applications(), { initialValue: [] });
}
