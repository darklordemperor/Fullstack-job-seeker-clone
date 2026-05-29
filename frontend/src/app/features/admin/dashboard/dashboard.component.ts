import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AdminRepository } from '../../../data/admin.repository';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  template: `
    <main class="shell py-8">
      <h1 class="text-2xl font-bold">Admin dashboard</h1>
      @if (stats(); as stats) {
        <section class="mt-7 grid gap-4 md:grid-cols-4">
          @for (metric of [
            { label: 'Users', value: stats.totalUsers },
            { label: 'Job seekers', value: stats.totalJobSeekers },
            { label: 'Employers', value: stats.totalEmployers },
            { label: 'Jobs', value: stats.totalJobs },
            { label: 'Applications', value: stats.totalApplications },
            { label: 'New users', value: stats.newUsersThisMonth },
            { label: 'New jobs', value: stats.newJobsThisMonth },
            { label: 'Active jobs', value: stats.activeJobs },
          ]; track metric.label) {
            <article class="card-surface p-5">
              <p class="text-sm text-slate-500">{{ metric.label }}</p>
              <p class="mt-3 text-3xl font-bold">{{ metric.value }}</p>
            </article>
          }
        </section>
      }
    </main>
  `,
})
export class AdminDashboardComponent {
  private readonly repository = inject(AdminRepository);
  protected readonly stats = toSignal(this.repository.stats());
}
