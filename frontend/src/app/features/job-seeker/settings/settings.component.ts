import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { JOB_SEEKER_REPOSITORY } from '../../../core/di/repository.tokens';
import { SeekerSettings } from '../../../domain/hiring.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-job-seeker-settings', standalone: true, imports: [FormsModule],
  template: `
    <main class="shell max-w-3xl py-8">
      <h1 class="text-3xl font-bold">Profile settings</h1><p class="mt-2 text-sm text-slate-600">Manage your contact details and discovery preferences.</p>
      @if (error()) { <p role="alert" class="mt-5 rounded bg-red-50 p-4 text-red-800">{{ error() }} <button class="underline" (click)="load()">Retry</button></p> }
      @if (loading()) { <p role="status" class="mt-6">Loading settings…</p> }
      @else if (settings(); as current) {
        <form #form="ngForm" class="card-surface mt-6 grid gap-5 p-6" (ngSubmit)="save()">
          <label class="grid gap-2 text-sm font-semibold">Display name<input name="displayName" required maxlength="160" class="h-11 rounded border px-3" [(ngModel)]="current.displayName"></label>
          <label class="grid gap-2 text-sm font-semibold">Contact email<input name="contactEmail" type="email" email required maxlength="320" class="h-11 rounded border px-3" [(ngModel)]="current.contactEmail"></label>
          <p class="text-xs text-slate-500">Your contact email does not change your sign-in email.</p>
          <label class="flex items-center justify-between border-t pt-4 text-sm font-semibold">Allow profile discovery when available<input name="discoverable" type="checkbox" [(ngModel)]="current.discoverable"></label>
          <label class="flex items-center justify-between border-t pt-4 text-sm font-semibold">Receive job recommendations when available<input name="recommendations" type="checkbox" [(ngModel)]="current.recommendations"></label>
          <p class="text-xs text-slate-500">Your preferences are saved. Profile discovery and recommendation emails are not available yet.</p>
          <button [disabled]="saving() || form.invalid" class="w-fit rounded bg-blue-800 px-5 py-3 font-bold text-white disabled:opacity-50">{{ saving() ? 'Saving…' : 'Save settings' }}</button>
        </form>
      }
    </main>`,
})
export class JobSeekerSettingsComponent implements OnInit {
  private readonly repo = inject(JOB_SEEKER_REPOSITORY);
  private readonly toast = inject(ToastService);
  protected readonly settings = signal<SeekerSettings | null>(null);
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  ngOnInit(): void { void this.load(); }
  protected async load(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try { this.settings.set(await firstValueFrom(this.repo.settings())); }
    catch { this.error.set('Unable to load settings.'); }
    finally { this.loading.set(false); }
  }
  protected async save(): Promise<void> {
    const value = this.settings(); if (!value || this.saving()) return;
    this.saving.set(true);
    try { this.settings.set(await firstValueFrom(this.repo.saveSettings(value))); this.toast.success('Settings saved'); }
    catch { /* Server error is displayed by the interceptor. */ }
    finally { this.saving.set(false); }
  }
}
