import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { EMPLOYER_REPOSITORY } from '../../../core/di/repository.tokens';
import { EmployerProfile } from '../../../domain/employer.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-employer-settings', standalone: true, imports: [FormsModule],
  template: `
    <main class="shell max-w-3xl py-8"><h1 class="text-3xl font-bold">Company profile</h1>
      <p class="mt-2 text-sm text-slate-600">Help candidates understand the team they could join.</p>
      @if (error()) { <p role="alert" class="mt-5 rounded bg-red-50 p-4 text-red-800">{{ error() }} <button class="underline" (click)="load()">Retry</button></p> }
      @if (profile(); as company) {
        <form #form="ngForm" class="card-surface mt-6 grid gap-4 p-6" (ngSubmit)="save()">
          <label class="grid gap-2 text-sm font-semibold">Company name<input name="companyName" required maxlength="180" class="rounded border p-3" [(ngModel)]="company.companyName"></label>
          <label class="grid gap-2 text-sm font-semibold">Website<input name="website" type="url" class="rounded border p-3" [(ngModel)]="company.website"></label>
          <label class="grid gap-2 text-sm font-semibold">Location<input name="location" maxlength="180" class="rounded border p-3" [(ngModel)]="company.location"></label>
          <label class="grid gap-2 text-sm font-semibold">About the company<textarea name="description" maxlength="10000" class="min-h-32 rounded border p-3" [(ngModel)]="company.description"></textarea></label>
          <button [disabled]="saving() || form.invalid" class="w-fit rounded bg-blue-800 px-6 py-3 font-bold text-white disabled:opacity-50">{{ saving() ? 'Saving…' : 'Save company profile' }}</button>
        </form>
      } @else if (!error()) { <p role="status" class="mt-6">Loading company profile…</p> }
    </main>`,
})
export class EmployerSettingsComponent implements OnInit {
  private readonly repo = inject(EMPLOYER_REPOSITORY);
  private readonly toast = inject(ToastService);
  protected readonly profile = signal<EmployerProfile | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  ngOnInit(): void { void this.load(); }
  protected async load(): Promise<void> {
    this.error.set('');
    try { this.profile.set(await firstValueFrom(this.repo.profile())); }
    catch { this.error.set('Unable to load company profile.'); }
  }
  protected async save(): Promise<void> {
    const company = this.profile(); if (!company || this.saving()) return;
    this.saving.set(true);
    try { this.profile.set(await firstValueFrom(this.repo.updateProfile(company))); this.toast.success('Company profile saved'); }
    catch { /* The interceptor reports the error; keep the form for retry. */ }
    finally { this.saving.set(false); }
  }
}
