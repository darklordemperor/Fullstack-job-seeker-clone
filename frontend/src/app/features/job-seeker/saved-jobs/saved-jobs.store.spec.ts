import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { JOB_SEEKER_REPOSITORY } from '../../../core/di/repository.tokens';
import { SavedJobsStore } from './saved-jobs.store';
import { PagedResponse } from '../../../domain/page.model';
import { SavedJob } from '../../../domain/saved-job.model';

describe('SavedJobsStore', () => {
  const job: SavedJob = { jobId: 'id', title: 'Engineer', companyName: 'Team', location: 'Bangkok', status: 'ACTIVE', savedAt: '2026-01-01T00:00:00Z' };
  const result: PagedResponse<SavedJob> = { content: [job], totalElements: 9, totalPages: 2, page: 1 };
  const repo = { savedJobsPage: vi.fn(), unsaveJob: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [SavedJobsStore, { provide: JOB_SEEKER_REPOSITORY, useValue: repo }] });
  });
  it('falls back to the previous page after removing its last job', async () => {
    repo.savedJobsPage.mockReturnValueOnce(of(result)).mockReturnValueOnce(of({ ...result, content: [], totalPages: 1, totalElements: 8 }))
      .mockReturnValueOnce(of({ ...result, totalPages: 1, page: 0, totalElements: 8 }));
    repo.unsaveJob.mockReturnValue(of(undefined));
    const store = TestBed.inject(SavedJobsStore);
    await store.load(1); await store.remove(job.jobId);
    expect(store.page()).toBe(0); expect(store.total()).toBe(8);
    expect(repo.savedJobsPage.mock.calls).toEqual([[1], [1], [0]]);
  });
  it('keeps jobs on removal failure and allows retry', async () => {
    repo.savedJobsPage.mockReturnValue(of(result)); repo.unsaveJob.mockReturnValue(throwError(() => new Error('Offline')));
    const store = TestBed.inject(SavedJobsStore); await store.load(1); await store.remove('id');
    expect(store.jobs()).toEqual([job]); expect(store.removalError()).toContain('Unable to remove'); expect(store.removing()).toBe('');
    repo.unsaveJob.mockReturnValue(of(undefined)); await store.remove('id'); expect(store.removalError()).toBe('');
  });
  it('ignores stale loads and reports failed loads without inventing empty success', async () => {
    const old = new Subject<PagedResponse<SavedJob>>(); repo.savedJobsPage.mockReturnValueOnce(old).mockReturnValueOnce(of(result));
    const store = TestBed.inject(SavedJobsStore); const pending = store.load(0); await store.load(1);
    old.next({ ...result, page: 0 }); old.complete(); await pending;
    expect(store.page()).toBe(1);
    repo.savedJobsPage.mockReturnValue(throwError(() => new Error('Offline'))); await store.load(1);
    expect(store.error()).toContain('Unable to load'); expect(store.loading()).toBe(false);
    repo.savedJobsPage.mockReturnValue(of({ content: [], totalElements: 0, totalPages: 1, page: 0 })); await store.load(0);
    expect(store.jobs()).toEqual([]); expect(store.error()).toBe('');
  });
  it('prevents duplicate removes and ignores loads after disposal', async () => {
    repo.savedJobsPage.mockReturnValue(of(result)); const deletion = new Subject<void>(); repo.unsaveJob.mockReturnValue(deletion);
    const store = TestBed.inject(SavedJobsStore); await store.load(1);
    const pending = store.remove('id'); await store.remove('id'); expect(repo.unsaveJob).toHaveBeenCalledOnce();
    store.dispose(); deletion.next(); deletion.complete(); await pending;
    expect(repo.savedJobsPage).toHaveBeenCalledOnce();
  });
});
