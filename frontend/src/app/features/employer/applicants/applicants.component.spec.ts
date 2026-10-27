import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApplicantsComponent } from './applicants.component';
import { EMPLOYER_REPOSITORY } from '../../../core/di/repository.tokens';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ApplicationDetail } from '../../../domain/hiring.model';

describe('Applicant review', () => {
  const detail: ApplicationDetail = {
    application: { id: 'a', jobId: 'j', jobSeekerId: 's', status: 'SUBMITTED', appliedAt: '2026-10-22', applicantName: 'Alex' },
    submission: null, timeline: [],
  };
  let repo: { applicants: ReturnType<typeof vi.fn>; applicant: ReturnType<typeof vi.fn>; moveApplicant: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    repo = { applicants: vi.fn(() => of({ content: [detail.application], page: 0, totalElements: 1, totalPages: 1 })),
      applicant: vi.fn(() => of(detail)), moveApplicant: vi.fn(() => of({ ...detail.application, status: 'REVIEWING' })) };
    toast = { success: vi.fn(), error: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'j' }) } } },
      { provide: EMPLOYER_REPOSITORY, useValue: repo }, { provide: ToastService, useValue: toast }] });
  });
  it('shows real applicants and explains missing historical snapshots', async () => {
    const fixture = TestBed.createComponent(ApplicantsComponent);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Alex');
    await fixture.componentInstance['review']('a'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('no submitted-profile snapshot');
    expect(fixture.componentInstance['nextStatuses']('HIRED')).toEqual([]);
  });
  it('requires a note and sends the currently reviewed status', async () => {
    const fixture = TestBed.createComponent(ApplicantsComponent);
    await fixture.componentInstance['review']('a');
    fixture.componentInstance['nextStatus'].set('REVIEWING');
    await fixture.componentInstance['move']();
    expect(repo.moveApplicant).not.toHaveBeenCalled();
    fixture.componentInstance['reason'].set(' Technical review ');
    await fixture.componentInstance['move']();
    expect(repo.moveApplicant).toHaveBeenCalledWith('a', 'SUBMITTED', 'REVIEWING', 'Technical review');
    expect(toast.success).toHaveBeenCalledOnce();
  });
  it('keeps the current application unchanged after a conflicting update', async () => {
    repo.moveApplicant.mockReturnValue(throwError(() => new Error('Conflict')));
    const fixture = TestBed.createComponent(ApplicantsComponent);
    await fixture.componentInstance['review']('a');
    fixture.componentInstance['nextStatus'].set('REVIEWING'); fixture.componentInstance['reason'].set('Review');
    await fixture.componentInstance['move']();
    expect(toast.success).not.toHaveBeenCalled();
    expect(fixture.componentInstance['detail']()?.application.status).toBe('SUBMITTED');
    expect(fixture.componentInstance['saving']()).toBe(false);
  });
});
