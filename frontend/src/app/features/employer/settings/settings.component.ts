import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { EmployerRepository } from '../../../data/employer.repository';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-employer-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="shell max-w-3xl py-8">
      <h1 class="text-2xl font-bold">Company profile settings</h1>
      <p class="mt-2 text-sm text-slate-600">Keep the employer profile visible to job seekers.</p>
      <section class="card-surface mt-6 grid gap-4 p-6">
        <input class="h-11 rounded border border-slate-300 px-3" placeholder="Company name" [ngModel]="companyName()" (ngModelChange)="companyName.set($event)">
        <input class="h-11 rounded border border-slate-300 px-3" placeholder="Website" [ngModel]="website()" (ngModelChange)="website.set($event)">
        <input class="h-11 rounded border border-slate-300 px-3" placeholder="Location" [ngModel]="location()" (ngModelChange)="location.set($event)">
        <textarea class="min-h-32 rounded border border-slate-300 p-3" placeholder="Company description" [ngModel]="description()" (ngModelChange)="description.set($event)"></textarea>
        <button type="button" class="w-fit rounded-md bg-[#174ea6] px-5 py-3 text-sm font-bold text-white" (click)="save()">Save company profile</button>
      </section>
    </main>
  `,
})
export class EmployerSettingsComponent {
  private readonly repository = inject(EmployerRepository);
  private readonly toast = inject(ToastService);
  protected readonly companyName = signal('Sansiri Public Company Limited');
  protected readonly website = signal('https://example.com');
  protected readonly location = signal('Bangkok');
  protected readonly description = signal('A growing employer looking for talented people to join the team.');

  protected async save(): Promise<void> {
    await firstValueFrom(this.repository.updateProfile({
      companyName: this.companyName(),
      website: this.website(),
      location: this.location(),
      description: this.description(),
    }));
    this.toast.success('Company profile saved');
  }
}
