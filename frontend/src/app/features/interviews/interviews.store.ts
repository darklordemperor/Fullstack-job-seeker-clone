import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { INTERVIEW_REPOSITORY, EMPLOYER_REPOSITORY } from '../../core/di/repository.tokens';
import { SCHEDULE_INTERVIEW } from '../../core/di/use-case.tokens';
import { Interview, InterviewProposal, InterviewViewer, CalendarFile, InterviewAction, InterviewRevision } from '../../domain/interview.model';

export const InterviewsStore = signalStore(
  withState({ focusedId: '' }),
  withState({ historyItem: null as Interview | null, revisions: [] as InterviewRevision[], historyPage: 0, historyPages: 1, historyLoading: false, historyError: '', items: [] as Interview[], page: 0, totalPages: 1, total: 0, upcoming: true, loading: false, busy: false, error: '', actionError: '', notice: '', applicant: null as { id: string; name: string; job: string } | null }),
  withMethods((store, repo = inject(INTERVIEW_REPOSITORY), scheduler = inject(SCHEDULE_INTERVIEW), employer = inject(EMPLOYER_REPOSITORY)) => {
    let version = 0, historyVersion = 0, destroyed = false;
    const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to complete this action. Please try again.';
    async function load(viewer: InterviewViewer, page = 0, upcoming = store.upcoming()): Promise<void> {
      const current = ++version;
      patchState(store, { focusedId: '', loading: true, error: '', actionError: '', page, upcoming });
      try {
        let result = await firstValueFrom(repo.list(viewer, upcoming, page));
        if (result.page > 0 && !result.content.length) result = await firstValueFrom(repo.list(viewer, upcoming, Math.max(0,result.totalPages-1)));
        if (!destroyed && version === current) patchState(store, { items: result.content, total: result.totalElements, totalPages: result.totalPages, page: result.page });
      } catch (error) { if (!destroyed && version === current) patchState(store, { error: message(error) }); }
      finally { if (!destroyed && version === current) patchState(store, { loading: false }); }
    }
    return {
      load,
      async open(viewer: InterviewViewer, id: string): Promise<void> {
        const current=++version;
        patchState(store,{focusedId:id,items:[],loading:true,error:'',actionError:'',upcoming:false,page:0,totalPages:1});
        try {
          const item=await firstValueFrom(repo.detail(viewer,id));
          if (!destroyed && current===version) patchState(store,{items:[item],total:1});
        } catch (error) { if (!destroyed && current===version) patchState(store,{error:message(error)}); }
        finally { if (!destroyed && current===version) patchState(store,{loading:false}); }
      },
      async history(viewer: InterviewViewer, item: Interview, page = 0): Promise<void> {
        const current = ++historyVersion;
        patchState(store, { historyItem: item, revisions: [], historyPage: page, historyLoading: true, historyError: '' });
        try {
          const result = await firstValueFrom(repo.history(viewer,item.id,page));
          if (!destroyed && current === historyVersion) patchState(store, { revisions: result.content, historyPage: result.page, historyPages: result.totalPages });
        } catch (error) { if (!destroyed && current === historyVersion) patchState(store, { historyError: message(error) }); }
        finally { if (!destroyed && current === historyVersion) patchState(store, { historyLoading: false }); }
      },
      closeHistory(): void { ++historyVersion; patchState(store, { historyItem: null, revisions: [], historyLoading: false }); },
      clearAction(): void { patchState(store, { actionError: '', notice: '' }); },
      async loadApplicant(id: string): Promise<boolean> {
        patchState(store, { busy: true, actionError: '', applicant: null });
        try {
          const detail = await firstValueFrom(employer.applicant(id));
          if (destroyed) return false;
          patchState(store, { applicant: { id, name: detail.application.applicantName || 'Candidate', job: detail.application.jobTitle || 'Application' } });
          return true;
        } catch (error) { if (!destroyed) patchState(store, { actionError: message(error) }); return false; }
        finally { if (!destroyed) patchState(store, { busy: false }); }
      },
      async schedule(applicationId: string, proposal: InterviewProposal, existing?: Interview): Promise<boolean> {
        if (store.busy()) return false;
        patchState(store, { busy: true, actionError: '', notice: '' });
        try {
          await firstValueFrom(scheduler.execute(applicationId, proposal, existing));
          if (destroyed) return false;
          patchState(store, { notice: 'Invitation saved. The candidate can respond in their interviews page.' });
          await load('employer', 0); return true;
        } catch (error) { if (!destroyed) patchState(store, { actionError: message(error) }); return false; }
        finally { if (!destroyed) patchState(store, { busy: false }); }
      },
      async decide(viewer: InterviewViewer, item: Interview, action: InterviewAction, slotId?: string): Promise<void> {
        if (store.busy()) return;
        patchState(store, { busy: true, actionError: '', notice: '' });
        try {
          await firstValueFrom(repo.decide(viewer,item.id,action,item.version,slotId));
          if (!destroyed) { patchState(store, { notice: 'Interview updated.' }); await load(viewer,store.page()); }
        } catch (error) { if (!destroyed) patchState(store, { actionError: message(error) + ' Refresh the list before retrying if the invitation has changed.' }); }
        finally { if (!destroyed) patchState(store, { busy: false }); }
      },
      async calendar(viewer: InterviewViewer, id: string): Promise<CalendarFile | null> {
        if (store.busy()) return null;
        patchState(store, { busy: true, actionError: '' });
        try { return await firstValueFrom(repo.calendar(viewer,id)); }
        catch (error) { if (!destroyed) patchState(store, { actionError: message(error) }); return null; }
        finally { if (!destroyed) patchState(store, { busy: false }); }
      },
      dispose(): void { destroyed=true; ++version; ++historyVersion; },
    };
  }),
  withHooks({ onDestroy(store) { store.dispose(); } }),
);
