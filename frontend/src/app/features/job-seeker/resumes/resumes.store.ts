import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { RESUME_REPOSITORY } from '../../../core/di/repository.tokens';
import { ResumeVersion, resumeFileError } from '../../../domain/resume.model';

export const ResumesStore = signalStore(
  withState({ items: [] as ResumeVersion[], loading: false, busy: '', error: '', actionError: '', notice: '' }),
  withMethods((store, repo = inject(RESUME_REPOSITORY)) => {
    let version = 0, destroyed = false;
    const message = (error: unknown) => {
      const value = error as { error?: { message?: string }; message?: string };
      return value?.error?.message ?? value?.message ?? 'Unable to update résumés. Please try again.';
    };
    async function load(): Promise<void> {
      if (store.busy()) return;
      const current = ++version; patchState(store, { loading: true, error: '' });
      try { const items = await firstValueFrom(repo.list()); if (!destroyed && current === version) patchState(store, { items }); }
      catch (error) { if (!destroyed && current === version) patchState(store, { error: message(error) }); }
      finally { if (!destroyed && current === version) patchState(store, { loading: false }); }
    }
    async function change(key: string, operation: () => Promise<void>): Promise<boolean> {
      if (store.busy() || store.loading() || store.error()) return false;
      patchState(store, { busy: key, actionError: '', notice: '' });
      try { await operation(); return !destroyed; }
      catch (error) { if (!destroyed) patchState(store, { actionError: message(error) }); return false; }
      finally { if (!destroyed) patchState(store, { busy: '' }); }
    }
    return {
      load,
      async upload(file: File): Promise<boolean> {
        const error = resumeFileError(file); if (error) { patchState(store, { actionError: error }); return false; }
        return change('upload', async () => {
          const item = await firstValueFrom(repo.upload(file));
          if (!destroyed) patchState(store, { items: [item, ...store.items().map(r => ({ ...r, current: false }))], notice: 'PDF uploaded and selected for future applications.' });
        });
      },
      async select(item: ResumeVersion): Promise<void> {
        await change(item.id, async () => { await firstValueFrom(repo.select(item.id));
          if (!destroyed) patchState(store, { items: store.items().map(r => ({ ...r, current: r.id === item.id })), notice: 'Résumé selected for future applications.' }); });
      },
      async clear(): Promise<void> {
        await change('clear', async () => { await firstValueFrom(repo.clear());
          if (!destroyed) patchState(store, { items: store.items().map(r => ({ ...r, current: false })), notice: 'Future applications will not attach a private PDF.' }); });
      },
      async remove(item: ResumeVersion): Promise<boolean> {
        return change(item.id, async () => { await firstValueFrom(repo.remove(item.id));
          if (!destroyed) patchState(store, { items: store.items().filter(r => r.id !== item.id), notice: 'Unused résumé deleted.' }); });
      },
      dispose() { destroyed = true; ++version; },
    };
  }), withHooks({ onDestroy(store) { store.dispose(); } }),
);
