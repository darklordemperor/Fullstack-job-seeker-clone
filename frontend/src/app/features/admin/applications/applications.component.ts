import { Component, inject, OnInit, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';
import { ADMIN_REPOSITORY } from '../../../core/di/repository.tokens';
import { JobApplication } from '../../../domain/application.model';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { DeleteApplicationDialogComponent } from './delete-application-dialog.component';

@Component({
  selector: 'app-admin-applications',
  standalone: true,
  imports: [DeleteApplicationDialogComponent, PaginationComponent],
  template: `
    <main class="shell py-8">
      <div>
        <h1 class="text-2xl font-bold">Application moderation</h1>
        <p class="mt-2 text-sm text-slate-600">Review submitted applications and record moderation reasons.</p>
      </div>
      @if (loading()) { <p class="mt-6" role="status">Loading applications…</p> }
      @if (error()) { <p class="mt-6 text-red-700" role="alert">{{ error() }} <button (click)="load()" class="underline">Retry</button></p> }
      @if (!loading() && !error() && applications().length === 0) { <p class="mt-6">No applications on this page.</p> }
      <section class="mt-6 card-surface divide-y divide-slate-100">
        @for (application of applications(); track application.id) {
          <article class="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p class="font-semibold">{{ application.jobTitle }}</p>
              <p class="mt-1 text-sm text-slate-600">{{ application.companyName }} · {{ application.status }}</p>
              <p class="mt-2 text-xs text-slate-500">{{ application.applicantName }} · {{ application.applicantEmail }}</p>
            </div>
            <button type="button" class="rounded border border-red-200 px-4 py-2 text-sm font-semibold text-red-600" (click)="selected.set(application)">Delete with reason</button>
          </article>
        }
      </section>
      <div class="mt-5">
        <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="load($event)" />
      </div>
      <app-delete-application-dialog [open]="!!selected()" (closed)="selected.set(null)" (confirmed)="remove($event)" />
    </main>
  `,
})
export class AdminApplicationsComponent implements OnInit {
  private readonly repository = inject(ADMIN_REPOSITORY);
  private readonly toast = inject(ToastService);
  protected readonly applications = signal<JobApplication[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(1);
  protected readonly selected = signal<JobApplication | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  private loadSequence = 0;

  ngOnInit(): void { void this.load(); }
  protected async load(page = this.page()): Promise<void> {
    const sequence = ++this.loadSequence;
    this.loading.set(true); this.error.set(''); this.applications.set([]);
    try {
      const result = await firstValueFrom(this.repository.applicationsPage(page));
      if (sequence !== this.loadSequence) return;
      if (result.content.length === 0 && page > 0) { await this.load(page - 1); return; }
      this.applications.set(result.content); this.page.set(result.page); this.totalPages.set(result.totalPages);
    } catch { if (sequence === this.loadSequence) this.error.set('Unable to load applications.'); }
    finally { if (sequence === this.loadSequence) this.loading.set(false); }
  }
  protected async remove(reason: string): Promise<void> {
    const application = this.selected();
    if (!application) return;
    try {
      await firstValueFrom(this.repository.deleteApplication(application.id, reason));
      this.selected.set(null);
      this.toast.success('Application deleted with moderation reason');
      await this.load();
    } catch { this.toast.error('Unable to delete application. Please retry.'); }
  }
}