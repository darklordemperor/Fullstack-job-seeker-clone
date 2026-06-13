import { Component, inject, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { AdminRepository } from '../../../data/admin.repository';
import { User } from '../../../domain/user.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { BanDialogComponent } from './ban-dialog/ban-dialog.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [BanDialogComponent],
  template: `
    <main class="shell py-8">
      <h1 class="text-2xl font-bold">Users</h1>
      <section class="mt-6 card-surface divide-y divide-slate-100">
        @for (user of users(); track user.id) {
          <div class="flex items-center justify-between p-5">
            <div>
              <p class="font-semibold">{{ user.email }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ user.role }}</p>
            </div>
            <div class="flex items-center gap-3">
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
      <app-ban-dialog [open]="!!selected()" (closed)="selected.set(null)" (confirmed)="ban($event)" />
    </main>
  `,
})
export class UsersComponent implements OnInit {
  private readonly repository = inject(AdminRepository);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStore);
  protected readonly users = signal<User[]>([]);
  protected readonly selected = signal<User | null>(null);

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

  private async loadUsers(): Promise<void> {
    this.users.set(await firstValueFrom(this.repository.users()));
  }
}
