import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { JOB_SEEKER_REPOSITORY } from '../../../core/di/repository.tokens';
import { SavedJobsComponent } from './saved-jobs.component';
import { SavedJob } from '../../../domain/saved-job.model';
import { PagedResponse } from '../../../domain/page.model';

describe('Saved jobs page', () => {
  const repo = { savedJobsPage: vi.fn(), unsaveJob: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: JOB_SEEKER_REPOSITORY, useValue: repo }] });
  });
  it('shows loading, a retryable failure and the empty state', async () => {
    const response = new Subject<PagedResponse<SavedJob>>(); repo.savedJobsPage.mockReturnValue(response);
    const fixture = TestBed.createComponent(SavedJobsComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Loading');
    response.error(new Error('Offline'));
    await vi.waitFor(() => { fixture.detectChanges(); expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull(); });
    repo.savedJobsPage.mockReturnValue(of({ content: [], totalElements: 0, totalPages: 1, page: 0 }));
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    await vi.waitFor(() => { fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Start your shortlist'); });
    expect(fixture.nativeElement.querySelector('a[href="/jobs"]')).not.toBeNull();
  });
  it('links only active jobs and keeps a failed removal visible', async () => {
    const base: SavedJob = { jobId: 'active', title: 'Engineer', companyName: 'Team', location: 'Bangkok', status: 'ACTIVE', savedAt: '2026-01-01T00:00:00Z' };
    repo.savedJobsPage.mockReturnValue(of({ content: [base, { ...base, jobId: 'closed', status: 'CLOSED' }, { ...base, jobId: 'draft', status: 'DRAFT', title: 'Job unavailable' }], totalElements: 3, totalPages: 1, page: 0 }));
    repo.unsaveJob.mockReturnValue(throwError(() => new Error('Offline')));
    const fixture = TestBed.createComponent(SavedJobsComponent); fixture.detectChanges();
    await vi.waitFor(() => { fixture.detectChanges(); expect(fixture.nativeElement.querySelectorAll('article')).toHaveLength(3); });
    expect(fixture.nativeElement.querySelectorAll('a[href^="/jobs/"]')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Closed'); expect(fixture.nativeElement.textContent).toContain('Unavailable');
    fixture.nativeElement.querySelector('article button').click();
    await vi.waitFor(() => { fixture.detectChanges(); expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Unable to remove'); });
    expect(fixture.nativeElement.querySelectorAll('article')).toHaveLength(3);
  });
});
