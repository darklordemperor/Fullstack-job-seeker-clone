import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AdminRepository } from '../../../data/admin.repository';
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
        <p class="mt-2 text-sm text-slate-600">Review 20 seeded application records, eight at a time.</p>
      </div>
      <section class="mt-6 card-surface divide-y divide-slate-100">
        @for (application of pagedApplications(); track application.id) {
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
        <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="page.set($event)" />
      </div>
      <app-delete-application-dialog [open]="!!selected()" (closed)="selected.set(null)" (confirmed)="remove($event)" />
    </main>
  `,
})
export class AdminApplicationsComponent {
  private readonly repository = inject(AdminRepository);
  private readonly toast = inject(ToastService);
  private readonly applications = toSignal(this.repository.applications(), { initialValue: [] });
  protected readonly page = signal(0);
  protected readonly selected = signal<JobApplication | null>(null);
  protected readonly removedIds = signal<string[]>([]);
  protected readonly activeApplications = computed(() => this.applications().filter((item) => !this.removedIds().includes(item.id)));
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.activeApplications().length / 8)));
  protected readonly pagedApplications = computed(() => this.activeApplications().slice(this.page() * 8, this.page() * 8 + 8));

  protected async remove(reason: string): Promise<void> {
    const application = this.selected();
    if (!application) {
      return;
    }
    await firstValueFrom(this.repository.deleteApplication(application.id, reason));
    this.removedIds.update((ids) => [...ids, application.id]);
    this.selected.set(null);
    this.toast.success('Application deleted with moderation reason');
  }
}
