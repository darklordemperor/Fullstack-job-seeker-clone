import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { EMPLOYER_REPOSITORY, HIRING_ANALYTICS_REPOSITORY } from '../../../core/di/repository.tokens';
import { AnalyticsStore } from './analytics.store';
import { HiringAnalytics } from '../../../domain/analytics.model';
describe('Analytics query state', () => {
  const filters = { from: '2024-01-01', to: '2024-01-31', jobId: '' };
  const repo = { report: vi.fn() }, employer = { jobs: vi.fn() };
  const setup = () => { TestBed.configureTestingModule({ providers: [AnalyticsStore, { provide: HIRING_ANALYTICS_REPOSITORY, useValue: repo }, { provide: EMPLOYER_REPOSITORY, useValue: employer }] }); return TestBed.inject(AnalyticsStore); };
  beforeEach(() => { vi.resetAllMocks(); repo.report.mockReturnValue(of({ applications: 0 })); employer.jobs.mockReturnValue(of([])); });
  it('preserves empty reports but never displays stale metrics as success after an error', async () => {
    const store = setup(); await store.load(filters); expect(store.report()?.applications).toBe(0); expect(store.error()).toBe('');
    repo.report.mockReturnValue(throwError(() => ({ error: { message: 'Unavailable' } }))); await store.load(filters); expect(store.report()).toBeNull(); expect(store.error()).toBe('Unavailable');
    repo.report.mockReturnValue(throwError(() => new Error('Offline'))); await store.load(filters); expect(store.error()).toBe('Offline');
    repo.report.mockReturnValue(throwError(() => null)); await store.load(filters); expect(store.error()).toContain('Unable');
    repo.report.mockClear(); await store.load({ ...filters, to: 'bad' }); expect(repo.report).not.toHaveBeenCalled(); expect(store.loading()).toBe(false);
  });
  it('ignores stale requests and invalidation, including after destruction', async () => {
    const store = setup(), pending = new Subject<HiringAnalytics>(); repo.report.mockReturnValueOnce(pending); const old = store.load(filters);
    await store.load(filters); pending.next({ applications: 99 } as HiringAnalytics); await old; expect(store.report()?.applications).toBe(0);
    const stale = new Subject<HiringAnalytics>(); repo.report.mockReturnValue(stale); const loading = store.load(filters); await store.load({ ...filters, from: '' }); stale.error(new Error('Old')); await loading; expect(store.error()).toContain('valid start');
    const last = new Subject<HiringAnalytics>(); repo.report.mockReturnValue(last); const stopped = store.load(filters); store.dispose(); last.next({ applications: 22 } as HiringAnalytics); await stopped; expect(store.report()).toBeNull();
  });
  it('keeps job selection loading independent from the report', async () => {
    const store = setup(); employer.jobs.mockReturnValue(throwError(() => new Error())); await store.loadJobs(); await store.load(filters);
    expect(store.jobsError()).toContain('Job choices'); expect(store.report()?.applications).toBe(0);
    employer.jobs.mockReturnValue(of([{ id: 'one' }])); await store.loadJobs(); expect(store.jobs()).toEqual([{ id: 'one' }]); expect(store.jobsError()).toBe('');
    const old = new Subject<never[]>(); employer.jobs.mockReturnValue(old); const loading = store.loadJobs(); store.dispose(); old.next([]); await loading; expect(store.jobs()).toEqual([{ id: 'one' }]);
  });
});
