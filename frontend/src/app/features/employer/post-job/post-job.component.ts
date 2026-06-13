import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { EmployerRepository } from '../../../data/employer.repository';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-post-job',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="shell max-w-3xl py-8">
      <h1 class="text-2xl font-bold">Post a job</h1>
      <p class="mt-2 text-sm text-slate-600">Create a draft with enough detail for job seekers to understand the role.</p>
      <form class="card-surface mt-6 grid gap-4 p-6" (ngSubmit)="save('DRAFT')">
        <input class="h-11 rounded-md border border-slate-300 px-3" placeholder="Job title" [ngModel]="title()" (ngModelChange)="title.set($event)" name="title">
        <input class="h-11 rounded-md border border-slate-300 px-3" placeholder="Location" [ngModel]="location()" (ngModelChange)="location.set($event)" name="location">
        <input class="h-11 rounded-md border border-slate-300 px-3" placeholder="Industry" [ngModel]="industry()" (ngModelChange)="industry.set($event)" name="industry">
        <div class="grid gap-4 sm:grid-cols-2">
          <input class="h-11 rounded-md border border-slate-300 px-3" type="number" placeholder="Minimum salary" [ngModel]="salaryMin()" (ngModelChange)="salaryMin.set($event)" name="salaryMin">
          <input class="h-11 rounded-md border border-slate-300 px-3" type="number" placeholder="Maximum salary" [ngModel]="salaryMax()" (ngModelChange)="salaryMax.set($event)" name="salaryMax">
        </div>
        <textarea class="min-h-36 rounded-md border border-slate-300 p-3" placeholder="Description" [ngModel]="description()" (ngModelChange)="description.set($event)" name="description"></textarea>
        <div class="flex flex-wrap gap-3">
          <button type="submit" class="rounded-md border border-slate-300 px-6 py-3 text-sm font-bold">Save draft</button>
          <button type="button" class="rounded-md bg-pink-600 px-6 py-3 text-sm font-bold text-white" (click)="save('ACTIVE')">Publish job</button>
        </div>
      </form>
    </main>
  `,
})
export class PostJobComponent {
  private readonly repository = inject(EmployerRepository);
  private readonly toast = inject(ToastService);
  protected readonly title = signal('');
  protected readonly location = signal('');
  protected readonly industry = signal('');
  protected readonly salaryMin = signal<number | null>(null);
  protected readonly salaryMax = signal<number | null>(null);
  protected readonly description = signal('');

  protected async save(status: 'ACTIVE' | 'DRAFT'): Promise<void> {
    try {
      const job = await firstValueFrom(this.repository.createJob({
        title: this.title(),
        location: this.location(),
        industry: this.industry(),
        salaryMin: this.salaryMin(),
        salaryMax: this.salaryMax(),
        salaryCurrency: 'THB',
        description: this.description(),
      }));
      if (status === 'ACTIVE') {
        await firstValueFrom(this.repository.updateJobStatus(job.id, 'ACTIVE'));
      }
      this.toast.success(status === 'ACTIVE' ? 'Job published for job seekers' : 'Job draft created');
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to create job');
    }
  }
}
