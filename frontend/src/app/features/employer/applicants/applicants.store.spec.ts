import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { EMPLOYER_REPOSITORY } from '../../../core/di/repository.tokens';
import { ApplicationDetail } from '../../../domain/hiring.model';
import { JobApplication } from '../../../domain/application.model';
import { PagedResponse } from '../../../domain/page.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ApplicantsStore } from './applicants.store';

describe('ApplicantsStore', () => {
  const detail = (id: string): ApplicationDetail => ({ application: { id, jobId: 'j', jobSeekerId: 's', status: 'SUBMITTED', appliedAt: '2026-10-23' }, submission: null, timeline: [] });
  const page = (id: string): PagedResponse<JobApplication> => ({ content: [detail(id).application], page: 0, totalElements: 1, totalPages: 1 });
  const empty = { content: [], page: 0, totalElements: 0, totalPages: 1 };
  let repo: { applicants: ReturnType<typeof vi.fn>; applicant: ReturnType<typeof vi.fn>; moveApplicant: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repo = { applicants: vi.fn(() => of(empty)), applicant: vi.fn((id: string) => of(detail(id))), moveApplicant: vi.fn(() => of(detail('a').application)) };
    toast = { success: vi.fn(), error: vi.fn() };
    TestBed.configureTestingModule({ providers: [ApplicantsStore, { provide: EMPLOYER_REPOSITORY, useValue: repo }, { provide: ToastService, useValue: toast }] });
  });

  it('ignores older list responses when filters change', async () => {
    const old = new Subject<PagedResponse<JobApplication>>();
    repo.applicants.mockReturnValueOnce(old);
    const store = TestBed.inject(ApplicantsStore);
    const pending = store.load('j', 0);
    expect(store.loading()).toBe(true);
    await store.filter('j', 'HIRED');
    old.next(page('old')); await pending;
    expect(store.applicants()).toEqual([]);
    expect(store.status()).toBe('HIRED');
    expect(store.loading()).toBe(false);
  });

  it('prevents a stale detail request from undoing a filter change', async () => {
    const old = new Subject<ApplicationDetail>();
    repo.applicant.mockReturnValueOnce(old);
    const store = TestBed.inject(ApplicantsStore);
    const pending = store.review('a');
    await store.filter('j', 'REJECTED');
    old.next(detail('a')); await pending;
    expect(store.detail()).toBeNull();
    expect(store.reviewLoading()).toBe(false);
  });

  it('clears stale counts and exposes an error on a failed load', async () => {
    repo.applicants.mockReturnValueOnce(of(page('a'))).mockReturnValueOnce(throwError(() => new Error('Forbidden')));
    const store = TestBed.inject(ApplicantsStore);
    await store.load('j', 0); await store.load('j', 0);
    expect(store.applicants()).toEqual([]);
    expect(store.total()).toBe(0);
    expect(store.error()).toContain('Unable to load');
  });

  it('blocks duplicate writes and preserves a newer selection while saving', async () => {
    const write = new Subject<JobApplication>();
    repo.moveApplicant.mockReturnValueOnce(write);
    const store = TestBed.inject(ApplicantsStore);
    await store.review('a');
    const pending = store.move('j', 'REVIEWING', 'Review');
    expect(await store.move('j', 'REVIEWING', 'Review')).toBe(false);
    await store.review('b');
    write.next({ ...detail('a').application, status: 'REVIEWING' }); await pending;
    expect(repo.moveApplicant).toHaveBeenCalledOnce();
    expect(store.detail()?.application.id).toBe('b');
    expect(store.saving()).toBe(false);
  });

  it('ignores late responses after the feature is destroyed', async () => {
    const response = new Subject<ApplicationDetail>();
    repo.applicant.mockReturnValueOnce(response);
    const store = TestBed.inject(ApplicantsStore);
    const pending = store.review('a');
    store.dispose(); response.next(detail('a')); await pending;
    expect(store.detail()).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
