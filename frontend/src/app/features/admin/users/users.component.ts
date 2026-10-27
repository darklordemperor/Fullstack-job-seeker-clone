import { Component, inject, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { ADMIN_REPOSITORY } from '../../../core/di/repository.tokens';
import { User } from '../../../domain/user.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { BanDialogComponent } from './ban-dialog/ban-dialog.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [BanDialogComponent, PaginationComponent],
  template: `
    <main class="shell py-8">
      <h1 class="text-2xl font-bold">Users</h1>
      @if (loading()) { <p class="mt-6" role="status">Loading users…</p> }
      @if (error()) { <p class="mt-6 text-red-700" role="alert">{{ error() }} <button (click)="loadUsers()" class="underline">Retry</button></p> }
      @if (!loading() && !error() && users().length === 0) { <p class="mt-6">No users on this page.</p> }
      <section class="mt-6 card-surface divide-y divide-slate-100">
        @for (user of users(); track user.id) {
          <div class="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div class="min-w-0">
              <p class="break-all font-semibold">{{ user.email }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ user.role }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              @if (isCurrentUser(user)) {
                <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#174ea6]">Current admin</span>
              } @else if (user.banned) {
                <button type="button" class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold" (click)="unban(user)">Unban</button>
              } @else {
                <button type="button" class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold" (click)="selected.set(user)">Ban</button>
              }
            </div>
          </div>
        }
      </section>
      <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="loadUsers($event)" />
      <app-ban-dialog [open]="!!selected()" (closed)="selected.set(null)" (confirmed)="ban($event)" />
    </main>
  `,
})
export class UsersComponent implements OnInit {
  private readonly repository = inject(ADMIN_REPOSITORY);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStore);
  protected readonly users = signal<User[]>([]);
  protected readonly selected = signal<User | null>(null);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  private loadSequence = 0;

  ngOnInit(): void {
    void this.loadUsers();
  }

  protected async ban(reason: string): Promise<void> {
    const user = this.selected();
    if (!user) {
      return;
    }
    try {
      await firstValueFrom(this.repository.banUser(user.id, reason));
      this.toast.success('User banned');
      this.selected.set(null);
      await this.loadUsers();
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to ban user');
    }
  }

  protected async unban(user: User): Promise<void> {
    try {
      await firstValueFrom(this.repository.unbanUser(user.id));
      this.toast.success('User unbanned');
      await this.loadUsers();
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to unban user');
    }
  }

  protected isCurrentUser(user: User): boolean {
    return user.email === this.auth.user()?.email;
  }

  protected async loadUsers(page = this.page()): Promise<void> {
    const sequence = ++this.loadSequence;
    this.loading.set(true); this.error.set(''); this.users.set([]);
    try {
      const result = await firstValueFrom(this.repository.usersPage(page));
      if (sequence !== this.loadSequence) return;
      this.users.set(result.content); this.page.set(result.page); this.totalPages.set(result.totalPages);
    } catch {
      if (sequence === this.loadSequence) this.error.set('Unable to load users.');
    } finally { if (sequence === this.loadSequence) this.loading.set(false); }
  }
}
