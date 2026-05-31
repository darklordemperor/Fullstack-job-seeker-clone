import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EmployerRepository } from '../../../data/employer.repository';
import { Job, JobStatus } from '../../../domain/job.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';

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
            <div class="flex flex-wrap gap-2">
              @if (job.status !== 'ACTIVE') {
                <button type="button" class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold" (click)="setStatus(job, 'ACTIVE')">Publish</button>
              } @else {
                <button type="button" class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold" (click)="setStatus(job, 'CLOSED')">Close</button>
              }
              <a [routerLink]="['/employer/applicants', job.id]" class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold">Applicants</a>
            </div>
          </article>
        }
      </div>
    </main>
  `,
})
export class ManageJobsComponent implements OnInit {
  private readonly repository = inject(EmployerRepository);
  private readonly toast = inject(ToastService);
  protected readonly jobs = signal<Job[]>([]);

  ngOnInit(): void {
    void this.loadJobs();
  }

  protected async setStatus(job: Job, status: JobStatus): Promise<void> {
    try {
      await firstValueFrom(this.repository.updateJobStatus(job.id, status));
      this.toast.success(status === 'ACTIVE' ? 'Job published for job seekers' : 'Job closed');
      await this.loadJobs();
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to update job status');
    }
  }

  private async loadJobs(): Promise<void> {
    this.jobs.set(await firstValueFrom(this.repository.jobs()));
  }
}
