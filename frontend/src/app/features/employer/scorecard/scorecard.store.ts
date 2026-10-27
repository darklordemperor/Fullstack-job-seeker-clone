import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { INTERVIEW_REPOSITORY, SCORECARD_REPOSITORY } from '../../../core/di/repository.tokens';
import { Interview } from '../../../domain/interview.model';
import { Scorecard, ScorecardFeedback } from '../../../domain/scorecard.model';
import { emptyScorecardFeedback, scorecardError } from '../../../domain/scorecard.rules';

export const ScorecardStore = signalStore(
  withState({ interview: null as Interview | null, scorecard: null as Scorecard | null, form: emptyScorecardFeedback(),
    loading: false, saving: false, error: '', actionError: '', notice: '', dirty: false,
    revisions: [] as Scorecard[], historyLoading: false, historyError: '', historyPage: 0, historyPages: 1 }),
  withMethods((store, repo = inject(SCORECARD_REPOSITORY), interviews = inject(INTERVIEW_REPOSITORY)) => {
    let loadVersion = 0, historyVersion = 0, destroyed = false;
    const message = (error: unknown) => { const value = error as { error?: { message?: string }; message?: string }; return value?.error?.message ?? value?.message ?? 'Unable to load feedback. Please try again.'; };
    async function history(page = 0): Promise<void> {
      const id = store.interview()?.id; if (!id) return;
      const version = ++historyVersion; patchState(store, { historyLoading: true, historyError: '' });
      try { const result = await firstValueFrom(repo.history(id, page));
        if (!destroyed && version === historyVersion) patchState(store, { revisions: result.content, historyPage: result.page, historyPages: result.totalPages }); }
      catch (error) { if (!destroyed && version === historyVersion) patchState(store, { historyError: message(error) }); }
      finally { if (!destroyed && version === historyVersion) patchState(store, { historyLoading: false }); }
    }
    function validation(finalize: boolean): string | null {
      if (store.scorecard()?.status === 'FINALIZED') return 'Finalized scorecards are read-only.';
      if (!['PROPOSED', 'CONFIRMED', 'COMPLETED'].includes(store.interview()?.status ?? '')) return 'This interview is read-only.';
      if (finalize && store.interview()?.status !== 'COMPLETED') return 'Complete the interview before finalizing its scorecard.';
      return scorecardError(store.form(), finalize);
    }
    return {
      history,
      async load(id: string): Promise<void> {
        if (store.saving()) return;
        const version = ++loadVersion; ++historyVersion;
        patchState(store, { loading: true, error: '', actionError: '', notice: '', historyLoading: false, revisions: [] });
        try {
          const [interview, scorecard] = await Promise.all([firstValueFrom(interviews.detail('employer', id)), firstValueFrom(repo.get(id))]);
          if (!destroyed && version === loadVersion) {
            patchState(store, { interview, scorecard, form: { ...(scorecard?.feedback ?? emptyScorecardFeedback()) }, dirty: false });
            await history(0);
          }
        } catch (error) { if (!destroyed && version === loadVersion) patchState(store, { error: message(error) }); }
        finally { if (!destroyed && version === loadVersion) patchState(store, { loading: false }); }
      },
      edit(change: Partial<ScorecardFeedback>): void {
        if (store.loading() || store.saving() || store.scorecard()?.status === 'FINALIZED' || !['PROPOSED', 'CONFIRMED', 'COMPLETED'].includes(store.interview()?.status ?? '')) return;
        patchState(store, { form: { ...store.form(), ...change }, dirty: true, notice: '' });
      },
      prepareFinalization(): boolean {
        const error = validation(true); patchState(store, { actionError: error ?? '' }); return !error && !store.saving() && !store.loading();
      },
      async save(finalize = false): Promise<boolean> {
        const id = store.interview()?.id; if (!id || store.saving() || store.loading() || store.error()) return false;
        const error = validation(finalize); if (error) { patchState(store, { actionError: error }); return false; }
        patchState(store, { saving: true, actionError: '', notice: '' });
        try {
          const scorecard = await firstValueFrom(repo.save(id, store.scorecard()?.version ?? 0, { ...store.form() }, finalize));
          if (destroyed) return false;
          patchState(store, { scorecard, form: { ...scorecard.feedback }, dirty: false, notice: finalize ? 'Scorecard finalized. This feedback is now read-only.' : 'Draft saved privately.' });
          await history(0); return true;
        } catch (error) { if (!destroyed) patchState(store, { actionError: message(error) }); return false; }
        finally { if (!destroyed) patchState(store, { saving: false }); }
      },
      dispose() { destroyed = true; ++loadVersion; ++historyVersion; },
    };
  }), withHooks({ onDestroy(store) { store.dispose(); } }),
);

