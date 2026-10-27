import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { JobActionsComponent } from './job-actions.component';
import { JOB_SEEKER_REPOSITORY } from '../../core/di/repository.tokens';
import { AuthStore } from '../../core/auth/auth.store';
import { ToastService } from '../../shared/ui/toast/toast.service';

describe('Job actions', () => {
  const repo = { jobState: vi.fn(), apply: vi.fn(), saveJob: vi.fn(), unsaveJob: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    repo.jobState.mockReturnValue(of({ applied: false, saved: false }));
    TestBed.configureTestingModule({ imports: [JobActionsComponent], providers: [provideRouter([]),
      { provide: JOB_SEEKER_REPOSITORY, useValue: repo }, { provide: AuthStore, useValue: { isJobSeeker: () => true } },
      { provide: ToastService, useValue: toast }] });
  });
  async function render() {
    const fixture = TestBed.createComponent(JobActionsComponent);
    fixture.componentRef.setInput('jobId', 'job-id'); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    return fixture;
  }
  it('disables applying when already applied', async () => {
    repo.jobState.mockReturnValue(of({ applied: true, saved: false }));
    const fixture = await render();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('Already applied'); expect(button.disabled).toBe(true);
  });
  it('shows applied only after the API succeeds', async () => {
    repo.apply.mockReturnValue(of({ id: 'application' }));
    const fixture = await render();
    fixture.nativeElement.querySelector('button').click(); await fixture.whenStable(); fixture.detectChanges();
    expect(repo.apply).toHaveBeenCalledWith('job-id');
    expect(fixture.nativeElement.textContent).toContain('Already applied');
    expect(toast.success).toHaveBeenCalledOnce();
  });
  it('keeps failed submissions retryable without a success toast', async () => {
    repo.apply.mockReturnValue(throwError(() => new Error('Unavailable')));
    const fixture = await render();
    fixture.nativeElement.querySelector('button').click(); await fixture.whenStable(); fixture.detectChanges();
    expect(toast.success).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(false);
  });
  it('shows a retry state when eligibility cannot be loaded', async () => {
    repo.jobState.mockReturnValue(throwError(() => new Error('Offline')));
    const fixture = await render();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
  });
});
