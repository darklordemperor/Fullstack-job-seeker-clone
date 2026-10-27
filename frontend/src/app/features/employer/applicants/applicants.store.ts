import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { EMPLOYER_REPOSITORY } from '../../../core/di/repository.tokens';
import { REVIEW_APPLICANT } from '../../../core/di/use-case.tokens';
import { ApplicationStatus, JobApplication } from '../../../domain/application.model';
import { ApplicationDetail } from '../../../domain/hiring.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';

interface ApplicantsState {
  applicants: JobApplication[];
  detail: ApplicationDetail | null;
  status: string;
  page: number;
  total: number;
  totalPages: number;
  loading: boolean;
  reviewLoading: boolean;
  saving: boolean;
  error: string;
}

export const ApplicantsStore = signalStore(
  withState<ApplicantsState>({
    applicants: [], detail: null, status: '', page: 0, total: 0, totalPages: 1,
    loading: false, reviewLoading: false, saving: false, error: '',
  }),
  withMethods((store, repo = inject(EMPLOYER_REPOSITORY), reviewCase = inject(REVIEW_APPLICANT), toast = inject(ToastService)) => {
    let loadVersion = 0, reviewVersion = 0, destroyed = false;

    async function load(jobId: string, page: number): Promise<void> {
      const version = ++loadVersion;
      patchState(store, { loading: true, error: '' });
      try {
        const result = await firstValueFrom(repo.applicants(jobId, page, store.status()));
        if (destroyed || version !== loadVersion) return;
        patchState(store, { applicants: result.content, page: result.page, total: result.totalElements, totalPages: result.totalPages });
      } catch {
        if (!destroyed && version === loadVersion) patchState(store, { applicants: [], total: 0, totalPages: 1, error: 'Unable to load applicants. Check your access and try again.' });
      } finally {
        if (!destroyed && version === loadVersion) patchState(store, { loading: false });
      }
    }

    async function review(id: string): Promise<void> {
      const version = ++reviewVersion;
      patchState(store, { reviewLoading: true, detail: null });
      try {
        const detail = await firstValueFrom(repo.applicant(id));
        if (!destroyed && version === reviewVersion) patchState(store, { detail });
      } catch {
        if (!destroyed && version === reviewVersion) toast.error('Unable to load the submitted profile');
      } finally {
        if (!destroyed && version === reviewVersion) patchState(store, { reviewLoading: false });
      }
    }

    return {
      load, review,
      filter(jobId: string, status: string): Promise<void> {
        ++reviewVersion;
        patchState(store, { status, detail: null, reviewLoading: false });
        return load(jobId, 0);
      },
      async move(jobId: string, next: ApplicationStatus | '', reason: string): Promise<boolean> {
        const current = store.detail();
        if (!current || !next || !reason.trim() || store.saving()) return false;
        const selectedVersion = reviewVersion;
        patchState(store, { saving: true });
        try {
          await firstValueFrom(reviewCase.execute({ applicationId: current.application.id, expectedStatus: current.application.status, status: next, reason }));
          if (destroyed) return false;
          toast.success('Application stage updated');
          await Promise.all([
            selectedVersion === reviewVersion ? review(current.application.id) : Promise.resolve(),
            load(jobId, store.page()),
          ]);
          return true;
        } catch {
          // Includes client validation, transport failures and stale-state conflicts.
          if (!destroyed) patchState(store, { error: 'Unable to update this application. Check the stage and note, then reload before retrying.' });
          return false;
        } finally {
          if (!destroyed) patchState(store, { saving: false });
        }
      },
      dispose(): void { destroyed = true; ++loadVersion; ++reviewVersion; },
    };
  }),
  withHooks({ onDestroy(store) { store.dispose(); } }),
);
