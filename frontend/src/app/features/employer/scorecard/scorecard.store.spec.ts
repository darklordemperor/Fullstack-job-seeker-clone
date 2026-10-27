import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { INTERVIEW_REPOSITORY, SCORECARD_REPOSITORY } from '../../../core/di/repository.tokens';
import { Scorecard } from '../../../domain/scorecard.model';
import { emptyScorecardFeedback } from '../../../domain/scorecard.rules';
import { ScorecardStore } from './scorecard.store';
describe('Scorecard workflow state', () => {
  const repo = { get: vi.fn(), save: vi.fn(), history: vi.fn() }, interviews = { detail: vi.fn() };
  const card: Scorecard = { interviewId: 'one', version: 1, status: 'DRAFT', feedback: { technicalSkills: 4, communication: 3, problemSolving: 5, strengths: 'Evidence', concerns: '', recommendation: 'HIRE' }, updatedAt: '2026-10-25T00:00:00Z', finalizedAt: null };
  const setup = () => { TestBed.configureTestingModule({ providers: [ScorecardStore, { provide: SCORECARD_REPOSITORY, useValue: repo }, { provide: INTERVIEW_REPOSITORY, useValue: interviews }] }); return TestBed.inject(ScorecardStore); };
  beforeEach(() => { vi.resetAllMocks(); repo.get.mockReturnValue(of(null)); repo.history.mockReturnValue(of({ content: [], page: 0, totalPages: 1 })); interviews.detail.mockReturnValue(of({ id: 'one', status: 'COMPLETED' })); });
  it('saves drafts then finalizes with version and freezes feedback', async () => {
    const store = setup(); await store.load('one'); expect(store.form()).toEqual(emptyScorecardFeedback()); expect(store.prepareFinalization()).toBe(false);
    store.edit(card.feedback); repo.save.mockReturnValue(of(card)); expect(await store.save()).toBe(true); expect(store.dirty()).toBe(false);
    expect(repo.save).toHaveBeenCalledWith('one', 0, card.feedback, false); expect(store.prepareFinalization()).toBe(true);
    repo.save.mockReturnValue(of({ ...card, version: 2, status: 'FINALIZED' })); expect(await store.save(true)).toBe(true);
    store.edit({ strengths: 'overwrite' }); expect(store.form().strengths).toBe('Evidence'); expect(await store.save()).toBe(false); expect(store.actionError()).toContain('read-only');
  });
  it('preserves unsaved feedback on conflicts and exposes read/history errors separately', async () => {
    const store = setup(); await store.load('one'); store.edit({ strengths: 'Unsaved' }); repo.save.mockReturnValue(throwError(() => ({ error: { message: 'Stale version' } })));
    expect(await store.save()).toBe(false); expect(store.form().strengths).toBe('Unsaved'); expect(store.dirty()).toBe(true); expect(store.actionError()).toBe('Stale version');
    repo.history.mockReturnValue(throwError(() => new Error('History unavailable'))); await store.history(0); expect(store.historyError()).toBe('History unavailable'); expect(store.error()).toBe('');
    repo.get.mockReturnValue(throwError(() => null)); await store.load('one'); expect(store.error()).toContain('Unable'); expect(await store.save()).toBe(false);
  });
  it('rejects closed interviews and premature finalization', async () => {
    const store = setup(); interviews.detail.mockReturnValue(of({ id: 'one', status: 'CONFIRMED' })); await store.load('one'); store.edit(card.feedback);
    expect(await store.save(true)).toBe(false); expect(store.actionError()).toContain('Complete');
    interviews.detail.mockReturnValue(of({ id: 'one', status: 'CANCELLED' })); await store.load('one'); expect(await store.save()).toBe(false); expect(repo.save).not.toHaveBeenCalled();
  });
  it('ignores stale reads and blocks double saves or late writes after disposal', async () => {
    const store = setup(); const pending = new Subject<Scorecard | null>(); repo.get.mockReturnValueOnce(pending); const loading = store.load('old');
    expect(await store.save()).toBe(false); store.edit(card.feedback); expect(store.dirty()).toBe(false);
    repo.get.mockReturnValue(of(card)); await store.load('one'); pending.next(null); await loading; expect(store.scorecard()).toEqual(card);
    const saving = new Subject<Scorecard>(); repo.save.mockReturnValue(saving); const first = store.save(); expect(await store.save()).toBe(false); await store.load('ignored');
    store.dispose(); saving.next({ ...card, version: 2 }); expect(await first).toBe(false); expect(store.scorecard()?.version).toBe(1);
  });
});
