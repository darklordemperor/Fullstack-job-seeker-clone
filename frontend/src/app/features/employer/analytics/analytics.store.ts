import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { EMPLOYER_REPOSITORY, HIRING_ANALYTICS_REPOSITORY } from '../../../core/di/repository.tokens';
import { AnalyticsFilters, HiringAnalytics } from '../../../domain/analytics.model';
import { analyticsFilterError } from '../../../domain/analytics.rules';
import { Job } from '../../../domain/job.model';
export const AnalyticsStore = signalStore(
  withState({ report: null as HiringAnalytics | null, loading: false, error: '', jobs: [] as Job[], jobsError: '', jobsLoading: false }),
  withMethods((store, repo = inject(HIRING_ANALYTICS_REPOSITORY), employer = inject(EMPLOYER_REPOSITORY)) => {
    let version = 0, jobsVersion = 0, destroyed = false;
    const message = (error: unknown) => { const e = error as { error?: { message?: string }; message?: string }; return e?.error?.message ?? e?.message ?? 'Unable to load hiring analytics. Please retry.'; };
    return {
      async load(filters: AnalyticsFilters) {
        const current = ++version, error = analyticsFilterError(filters);
        patchState(store, { report: null, loading: !error, error: error ?? '' }); if (error) return;
        try { const report = await firstValueFrom(repo.report({ ...filters })); if (!destroyed && version === current) patchState(store, { report }); }
        catch (error) { if (!destroyed && version === current) patchState(store, { error: message(error) }); }
        finally { if (!destroyed && version === current) patchState(store, { loading: false }); }
      },
      async loadJobs() {
        const current = ++jobsVersion; patchState(store, { jobsLoading: true, jobsError: '' });
        try { const jobs = await firstValueFrom(employer.jobs()); if (!destroyed && jobsVersion === current) patchState(store, { jobs }); }
        catch { if (!destroyed && jobsVersion === current) patchState(store, { jobsError: 'Job choices could not be loaded. Your report can still be viewed.' }); }
        finally { if (!destroyed && jobsVersion === current) patchState(store, { jobsLoading: false }); }
      },
      dispose() { destroyed = true; ++version; ++jobsVersion; },
    };
  }), withHooks({ onDestroy(store) { store.dispose(); } }),
);
