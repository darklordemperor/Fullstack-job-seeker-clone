import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { JOB_SEEKER_REPOSITORY } from '../../../core/di/repository.tokens';
import { SavedJob } from '../../../domain/saved-job.model';

export const SavedJobsStore = signalStore(
  withState({ jobs: [] as SavedJob[], page: 0, total: 0, totalPages: 1,
    loading: false, removing: '', error: '', removalError: '' }),
  withMethods((store, repo = inject(JOB_SEEKER_REPOSITORY)) => {
    let version = 0, destroyed = false;
    async function load(page = store.page()): Promise<void> {
      const current = ++version;
      patchState(store, { loading: true, error: '', page });
      try {
        let result = await firstValueFrom(repo.savedJobsPage(page));
        // Removing the final item on a page, including from another tab, can shrink the page count.
        if (result.page > 0 && result.content.length === 0) {
          result = await firstValueFrom(repo.savedJobsPage(Math.max(0, result.totalPages - 1)));
        }
        if (!destroyed && current === version) patchState(store, {
          jobs: result.content, page: result.page, total: result.totalElements, totalPages: result.totalPages,
        });
      } catch {
        if (!destroyed && current === version) patchState(store, { error: 'Unable to load saved jobs. Please try again.' });
      } finally {
        if (!destroyed && current === version) patchState(store, { loading: false });
      }
    }
    return {
      load,
      async remove(id: string): Promise<void> {
        if (store.removing() || store.loading()) return;
        patchState(store, { removing: id, removalError: '' });
        try {
          await firstValueFrom(repo.unsaveJob(id));
          if (!destroyed) await load();
        } catch {
          if (!destroyed) patchState(store, { removalError: 'Unable to remove this job. Your saved jobs have been kept; please retry.' });
        } finally {
          if (!destroyed) patchState(store, { removing: '' });
        }
      },
      dispose(): void { destroyed = true; ++version; },
    };
  }),
  withHooks({ onDestroy(store) { store.dispose(); } }),
);
