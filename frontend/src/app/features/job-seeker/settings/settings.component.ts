import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-job-seeker-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="shell max-w-3xl py-8">
      <h1 class="text-2xl font-bold">Profile settings</h1>
      <p class="mt-2 text-sm text-slate-600">Control how employers discover and contact you.</p>
      <section class="card-surface mt-6 grid gap-5 p-6">
        <label class="grid gap-2 text-sm font-semibold">Display name<input class="h-11 rounded border border-slate-300 px-3" [ngModel]="displayName()" (ngModelChange)="displayName.set($event)"></label>
        <label class="grid gap-2 text-sm font-semibold">Contact email<input class="h-11 rounded border border-slate-300 px-3" [ngModel]="email()" (ngModelChange)="email.set($event)"></label>
        <label class="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 text-sm font-semibold">
          Allow employers to discover my profile
          <input type="checkbox" [ngModel]="discoverable()" (ngModelChange)="discoverable.set($event)">
        </label>
        <label class="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 text-sm font-semibold">
          Email me matching job recommendations
          <input type="checkbox" [ngModel]="recommendations()" (ngModelChange)="recommendations.set($event)">
        </label>
        <button type="button" class="w-fit rounded-md bg-[#174ea6] px-5 py-3 text-sm font-bold text-white" (click)="save()">Save settings</button>
      </section>
    </main>
  `,
})
export class JobSeekerSettingsComponent {
  private readonly toast = inject(ToastService);
  protected readonly displayName = signal('Apirat Naresathien');
  protected readonly email = signal('apirat@example.com');
  protected readonly discoverable = signal(true);
  protected readonly recommendations = signal(true);

  protected save(): void {
    this.toast.success('Job seeker settings saved');
  }
}
