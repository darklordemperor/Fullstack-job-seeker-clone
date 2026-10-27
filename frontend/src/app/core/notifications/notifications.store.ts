import { effect, inject, untracked } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { NOTIFICATION_REPOSITORY } from '../di/repository.tokens';
import { AuthStore } from '../auth/auth.store';
import { InboxNotification } from '../../domain/notification.model';

const initial = { items: [] as InboxNotification[], unreadCount: null as number | null, countError: false,
  loading: false, busyId: '', error: '', actionError: '', page: 0, totalPages: 1, total: 0, unreadOnly: false };

export const NotificationsStore = signalStore(
  { providedIn: 'root' },
  withState(initial),
  withMethods((store, repo = inject(NOTIFICATION_REPOSITORY)) => {
    let userId: string | null = null, generation = 0, listVersion = 0, countVersion = 0;
    const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to load notifications. Please try again.';
    async function refreshCount(): Promise<void> {
      if (!userId) return;
      const session = generation, version = ++countVersion;
      try {
        const result = await firstValueFrom(repo.unreadCount());
        if (session === generation && version === countVersion) patchState(store, { unreadCount: result.unreadCount, countError: false });
      } catch { if (session === generation && version === countVersion) patchState(store, { unreadCount: null, countError: true }); }
    }
    async function load(page = 0, unreadOnly = store.unreadOnly()): Promise<void> {
      if (!userId) return;
      const session = generation, version = ++listVersion;
      patchState(store, { loading: true, error: '', actionError: '', page, unreadOnly });
      void refreshCount();
      try {
        let result = await firstValueFrom(repo.list(page, unreadOnly));
        if (result.page > 0 && !result.content.length) result = await firstValueFrom(repo.list(Math.max(0,result.totalPages-1), unreadOnly));
        if (session === generation && version === listVersion) patchState(store, { items: result.content, page: result.page, totalPages: result.totalPages, total: result.totalElements });
      } catch (error) { if (session === generation && version === listVersion) patchState(store, { error: message(error), items: [] }); }
      finally { if (session === generation && version === listVersion) patchState(store, { loading: false }); }
    }
    return {
      load, refreshCount,
      connect(id: string | null): void {
        if (id === userId) return;
        userId=id; ++generation; ++listVersion; ++countVersion;
        patchState(store, initial);
        if (id) void refreshCount();
      },
      async markRead(item: InboxNotification): Promise<void> {
        if (!userId || store.busyId() || item.readAt) return;
        const session = generation;
        patchState(store, { busyId: item.id, actionError: '' });
        try {
          await firstValueFrom(repo.markRead(item.id));
          if (session === generation) await load(store.page(),store.unreadOnly());
        } catch (error) { if (session === generation) patchState(store, { actionError: message(error) }); }
        finally { if (session === generation) patchState(store, { busyId: '' }); }
      },
    };
  }),
  withHooks({ onInit(store, auth = inject(AuthStore)) {
    store.connect(auth.user()?.id ?? null);
    effect(onCleanup => {
      const id = auth.user()?.id ?? null;
      untracked(() => store.connect(id));
      if (!id) return;
      const refresh = () => { if (document.visibilityState !== 'hidden') void store.refreshCount(); };
      const timer = setInterval(refresh,30_000);
      window.addEventListener('focus',refresh);
      onCleanup(() => { clearInterval(timer); window.removeEventListener('focus',refresh); });
    });
  }, onDestroy(store) { store.connect(null); } }),
);
