import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminApplicationsComponent } from './applications.component';
import { ADMIN_REPOSITORY } from '../../../core/di/repository.tokens';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { JobApplication } from '../../../domain/application.model';

describe('Application moderation', () => {
  const application: JobApplication = { id: 'a', jobId: 'j', jobSeekerId: 's', status: 'SUBMITTED', appliedAt: '2026-10-22', jobTitle: 'Engineer', companyName: 'Example' };
  let repo: { applicationsPage: ReturnType<typeof vi.fn>; deleteApplication: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    repo = { applicationsPage: vi.fn(page => of({ content: [application], totalPages: 2, totalElements: 9, page })), deleteApplication: vi.fn(() => of(undefined)) };
    toast = { success: vi.fn(), error: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: ADMIN_REPOSITORY, useValue: repo }, { provide: ToastService, useValue: toast }] });
  });
  it('requests the next page from the API', async () => {
    const fixture = TestBed.createComponent(AdminApplicationsComponent);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); await fixture.whenStable();
    const next = Array.from(fixture.nativeElement.querySelectorAll('nav button') as NodeListOf<HTMLButtonElement>).find(button => button.textContent?.includes('Next'))!;
    next.click(); await fixture.whenStable(); fixture.detectChanges(); await fixture.whenStable();
    expect(repo.applicationsPage).toHaveBeenLastCalledWith(1);
    expect(fixture.nativeElement.querySelector('[aria-current="page"]').textContent.trim()).toBe('2');
  });
  it('retains an application when deletion fails', async () => {
    repo.deleteApplication.mockReturnValue(throwError(() => new Error('Forbidden')));
    const fixture = TestBed.createComponent(AdminApplicationsComponent);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); await fixture.whenStable();
    fixture.componentInstance['selected'].set(application);
    await fixture.componentInstance['remove']('Moderation reason');
    expect(fixture.componentInstance['applications']()).toEqual([application]);
    expect(toast.success).not.toHaveBeenCalled(); expect(toast.error).toHaveBeenCalledOnce();
  });
  it('shows a visible error instead of sample rows', async () => {
    repo.applicationsPage.mockReturnValue(throwError(() => new Error('Offline')));
    const fixture = TestBed.createComponent(AdminApplicationsComponent);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Unable to load');
    expect(fixture.nativeElement.querySelector('article')).toBeNull();
  });
});
