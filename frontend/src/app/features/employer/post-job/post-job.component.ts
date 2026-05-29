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
      <form class="card-surface mt-6 grid gap-4 p-6" (ngSubmit)="save()">
        <input class="h-11 rounded-md border border-slate-300 px-3" placeholder="Job title" [ngModel]="title()" (ngModelChange)="title.set($event)" name="title">
        <input class="h-11 rounded-md border border-slate-300 px-3" placeholder="Location" [ngModel]="location()" (ngModelChange)="location.set($event)" name="location">
        <textarea class="min-h-36 rounded-md border border-slate-300 p-3" placeholder="Description" [ngModel]="description()" (ngModelChange)="description.set($event)" name="description"></textarea>
        <button type="submit" class="w-fit rounded-md bg-pink-600 px-6 py-3 text-sm font-bold text-white">Create draft</button>
      </form>
    </main>
  `,
})
export class PostJobComponent {
  private readonly repository = inject(EmployerRepository);
  private readonly toast = inject(ToastService);
  protected readonly title = signal('');
  protected readonly location = signal('');
  protected readonly description = signal('');

  protected async save(): Promise<void> {
    try {
      await firstValueFrom(this.repository.createJob({ title: this.title(), location: this.location(), description: this.description() }));
      this.toast.success('Job draft created');
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to create job');
    }
  }
}
