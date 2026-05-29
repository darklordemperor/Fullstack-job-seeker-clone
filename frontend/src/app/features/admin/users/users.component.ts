import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
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
            <button type="button" class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold" (click)="selected.set(user)">Ban</button>
          </div>
        }
      </section>
      <app-ban-dialog [open]="!!selected()" (closed)="selected.set(null)" (confirmed)="ban($event)" />
    </main>
  `,
})
export class UsersComponent {
  private readonly repository = inject(AdminRepository);
  private readonly toast = inject(ToastService);
  protected readonly users = toSignal(this.repository.users(), { initialValue: [] });
  protected readonly selected = signal<User | null>(null);

  protected async ban(reason: string): Promise<void> {
    const user = this.selected();
    if (!user) {
      return;
    }
    try {
      await firstValueFrom(this.repository.banUser(user.id, reason));
      this.toast.success('User banned');
      this.selected.set(null);
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Unable to ban user');
    }
  }
}
