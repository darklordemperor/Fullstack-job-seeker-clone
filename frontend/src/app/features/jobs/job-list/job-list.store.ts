import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { JOB_REPOSITORY } from '../../../core/di/repository.tokens';
import { Job, JobFilter } from '../../../domain/job.model';

interface JobListState {
  jobs: Job[];
  selected: Job | null;
  page: number;
  totalElements: number;
  totalPages: number;
  filters: JobFilter;
  loading: boolean;
  error: string | null;
}

const initialState: JobListState = {
  jobs: [],
  selected: null,
  page: 0,
  totalElements: 0,
  totalPages: 1,
  filters: { page: 0, size: 8 },
  loading: false,
  error: null,
};

export const JobListStore = signalStore(
  withState(initialState),
  withComputed(({ jobs }) => ({
    hasJobs: computed(() => jobs().length > 0),
  })),
  withMethods((store, repo = inject(JOB_REPOSITORY)) => {
    const loadData = rxMethod<JobFilter>(
      pipe(
        tap((filters) => patchState(store, { loading: true, error: null, filters })),
        switchMap((params) =>
          repo.fetch(params).pipe(
            tapResponse({
              next: (data) => patchState(store, {
                jobs: data.content,
                selected: data.content[0] ?? null,
                page: data.page,
                totalElements: data.totalElements,
                totalPages: data.totalPages,
                loading: false,
              }),
              error: (err: Error) => patchState(store, { error: err.message, loading: false, jobs: [], selected: null, totalElements: 0, totalPages: 1 }),
            }),
          ),
        ),
      ),
    );
    return {
      loadData,
      select(job: Job): void {
        patchState(store, { selected: job });
      },
      loadPage(page: number): void {
        const filters = store.filters();
        loadData({ ...filters, page, size: 8 });
      },
    };
  }),
);
