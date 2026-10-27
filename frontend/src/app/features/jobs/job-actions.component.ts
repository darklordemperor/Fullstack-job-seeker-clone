import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { JOB_SEEKER_REPOSITORY } from '../../core/di/repository.tokens';
import { AuthStore } from '../../core/auth/auth.store';
import { ToastService } from '../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-job-actions', standalone: true, imports: [RouterLink],
  template: `
    @if (auth.isJobSeeker()) {
      <div class="flex flex-wrap gap-3">
        <button class="rounded-md bg-pink-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
          [disabled]="pending() || loading() || !!error() || state()?.applied" (click)="apply()">{{ state()?.applied ? 'Already applied' : 'Apply now' }}</button>
        <button class="rounded-md border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-bold text-blue-800 disabled:opacity-50"
          [disabled]="pending() || loading() || !!error()" (click)="toggleSaved()">{{ state()?.saved ? 'Remove saved job' : 'Save job' }}</button>
      </div>
      <p class="mt-3 text-xs leading-5 text-slate-600">Applying includes your profile and selected résumé PDF, if any. <a routerLink="/job-seeker/resumes" class="font-semibold text-blue-800 underline">Manage résumés</a></p>
      @if (error()) { <p role="alert" class="mt-2 text-sm text-red-700">{{ error() }} <button class="underline" (click)="load(jobId())">Retry</button></p> }
      @if (loading()) { <p role="status" class="mt-2 text-xs text-slate-500">Checking your application…</p> }
    } @else {
      <a routerLink="/auth/login" class="inline-block rounded bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800">Sign in as a job seeker to apply or save</a>
    }`,
})
export class JobActionsComponent {
  readonly jobId = input.required<string>();
  protected readonly auth = inject(AuthStore);
  private readonly repo = inject(JOB_SEEKER_REPOSITORY);
  private readonly toast = inject(ToastService);
  protected readonly state = signal<{ applied: boolean; saved: boolean } | null>(null);
  protected readonly pending = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  private version = 0;
  constructor() {
    effect(() => {
      const id = this.jobId(), seeker = this.auth.isJobSeeker();
      untracked(() => { this.state.set(null); if (seeker) void this.load(id); });
    });
  }
  protected async load(id: string): Promise<void> {
    const version = ++this.version; this.loading.set(true); this.error.set('');
    try { const value = await firstValueFrom(this.repo.jobState(id)); if (version === this.version) this.state.set(value); }
    catch { if (version === this.version) this.error.set('Unable to check your application or saved job.'); }
    finally { if (version === this.version) this.loading.set(false); }
  }
  protected async apply(): Promise<void> {
    if (this.pending() || !this.state() || this.state()?.applied) return;
    const id = this.jobId(); this.pending.set(true);
    try {
      await firstValueFrom(this.repo.apply(id));
      if (id === this.jobId()) this.state.update(value => value && ({ ...value, applied: true }));
      this.toast.success('Application submitted');
    } catch { if (id === this.jobId()) await this.load(id); }
    finally { this.pending.set(false); }
  }
  protected async toggleSaved(): Promise<void> {
    const current = this.state(); if (!current || this.pending()) return;
    const id = this.jobId(); this.pending.set(true);
    try {
      await firstValueFrom(current.saved ? this.repo.unsaveJob(id) : this.repo.saveJob(id));
      if (id === this.jobId()) this.state.update(value => value && ({ ...value, saved: !current.saved }));
    } catch { /* The interceptor displays the server error. */ }
    finally { this.pending.set(false); }
  }
}
