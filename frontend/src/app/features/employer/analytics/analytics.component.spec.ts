import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { EMPLOYER_REPOSITORY, HIRING_ANALYTICS_REPOSITORY } from '../../../core/di/repository.tokens';
import { AnalyticsComponent } from './analytics.component';
describe('Hiring analytics page', () => {
  const repo = { report: vi.fn() }, jobs = { jobs: vi.fn() };
  const empty = { from: '2024-01-01', to: '2024-01-31', asOf: '2024-02-01T00:00:00Z', jobId: null, applications: 0, applicationsWithoutSubmissionHistory: 0,
    funnel: ['SUBMITTED', 'REVIEWING', 'HIRED'].map(status => ({ status, applications: 0, conversionPercent: null })), currentStatuses: ['SUBMITTED', 'REVIEWING', 'HIRED', 'REJECTED'].map(status => ({ status, applications: 0 })), timeToHire: { sampleSize: 0, averageDays: null, medianDays: null, hiredWithoutTimestamp: 0 } };
  beforeEach(() => {
    vi.resetAllMocks(); repo.report.mockReturnValue(of(empty)); jobs.jobs.mockReturnValue(of([]));
    const params = convertToParamMap({ from: '2024-01-01', to: '2024-01-31' });
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { queryParamMap: of(params), snapshot: { queryParamMap: params } } }, { provide: HIRING_ANALYTICS_REPOSITORY, useValue: repo }, { provide: EMPLOYER_REPOSITORY, useValue: jobs }] });
  });
  it('renders true empty and unavailable duration states instead of fake zero-day hires', async () => {
    const f = TestBed.createComponent(AnalyticsComponent); f.detectChanges(); await vi.waitFor(() => { f.detectChanges(); expect(f.nativeElement.textContent).toContain('No applications in this period'); });
    expect(f.nativeElement.querySelector('[data-testid=analytics-median]').textContent).toBe('—');
    expect(repo.report).toHaveBeenCalledWith({ from: '2024-01-01', to: '2024-01-31', jobId: '' });
  });
  it('shows completeness caveats, real zero durations, and validates before navigating', async () => {
    repo.report.mockReturnValue(of({ ...empty, applications: 1, applicationsWithoutSubmissionHistory: 1, timeToHire: { sampleSize: 1, averageDays: 0, medianDays: 0, hiredWithoutTimestamp: 1 } }));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(false);
    const f = TestBed.createComponent(AnalyticsComponent); f.detectChanges(); await vi.waitFor(() => { f.detectChanges(); expect(f.nativeElement.textContent).toContain('Some historical data is incomplete'); });
    const root = f.nativeElement as HTMLElement; expect(root.querySelector('[data-testid=analytics-median]')?.textContent).toBe('0 days');
    const from = root.querySelector<HTMLInputElement>('#analytics-from')!; from.value = '2024-02-01'; from.dispatchEvent(new Event('input')); f.detectChanges();
    root.querySelector('form')!.dispatchEvent(new Event('submit')); await f.whenStable(); f.detectChanges(); expect(root.textContent).toContain('Choose an ordered'); expect(navigate).not.toHaveBeenCalled();
    from.value = '2024-01-10'; from.dispatchEvent(new Event('input')); f.detectChanges(); root.querySelector('form')!.dispatchEvent(new Event('submit')); await f.whenStable(); expect(navigate).toHaveBeenCalled();
  });
  it('shows loading and retry without stale statistics', async () => {
    const pending = new Subject(); repo.report.mockReturnValueOnce(pending); const f = TestBed.createComponent(AnalyticsComponent); f.detectChanges(); expect(f.nativeElement.textContent).toContain('Calculating');
    pending.error(new Error('Unavailable')); await vi.waitFor(() => { f.detectChanges(); expect(f.nativeElement.textContent).toContain('Report unavailable'); });
    expect(f.nativeElement.querySelector('[data-testid=analytics-applications]')).toBeNull();
    [...f.nativeElement.querySelectorAll('button')].find((b: any) => b.textContent.trim() === 'Retry report').click(); await vi.waitFor(() => { f.detectChanges(); expect(f.nativeElement.textContent).toContain('No applications'); });
  });
});
