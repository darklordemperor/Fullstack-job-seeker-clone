import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { JOB_SEEKER_REPOSITORY } from '../../../core/di/repository.tokens';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ProfileComponent } from './profile.component';
import { JobSeekerProfile } from '../../../domain/job-seeker-profile.model';

describe('Work experience editor', () => {
  const profile: JobSeekerProfile = { fullName: 'Candidate', expectedSalary: { currency: 'THB' }, skills: [], workExperiences: [], educations: [], languages: [], licenses: [] };
  const repo = { profile: vi.fn(), updateProfile: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks(); repo.profile.mockReturnValue(of(profile));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: JOB_SEEKER_REPOSITORY, useValue: repo }, { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } }] });
  });
  it('validates drafts, retains failed edits, blocks duplicate saves and closes only after success', async () => {
    const fixture = TestBed.createComponent(ProfileComponent);
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
    const click = async (name: string) => {
      const button = [...fixture.nativeElement.querySelectorAll('button')].find((b: unknown) => (b as HTMLButtonElement).textContent?.trim() === name) as HTMLButtonElement;
      button.click(); await settle();
    };
    await settle(); fixture.nativeElement.querySelector('[aria-label="Edit work experience"]').click(); await settle();
    await click('Add experience'); await click('Save');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('required'); expect(repo.updateProfile).not.toHaveBeenCalled();
    const fill = async (index: number, value: string) => {
      const input = fixture.nativeElement.querySelectorAll('app-work-experience-editor input')[index] as HTMLInputElement;
      input.value = value; input.dispatchEvent(new Event('input')); await settle();
    };
    await fill(0, 'Engineer'); await fill(1, 'Example'); await fill(2, '2024-01-01'); await fill(3, '2023-01-01');
    await click('Save'); expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('end date');
    await fill(3, '2025-01-01'); repo.updateProfile.mockReturnValue(throwError(() => new Error('Offline')));
    await click('Save'); expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Offline');
    expect(fixture.nativeElement.querySelector('app-work-experience-editor input').value).toBe('Engineer');
    const pending = new Subject<JobSeekerProfile>(); repo.updateProfile.mockReturnValue(pending);
    await click('Save'); await click('Saving…');
    expect(repo.updateProfile).toHaveBeenCalledTimes(2);
    pending.next({ ...profile, workExperiences: [{ title: 'Engineer', company: 'Example' }] }); pending.complete(); await settle();
    await vi.waitFor(() => { fixture.detectChanges(); expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull(); });
    expect(fixture.nativeElement.textContent).toContain('Engineer');
  });
  it('cancels edits without writing and supports removing all work experience', async () => {
    repo.profile.mockReturnValue(of({ ...profile, workExperiences: [{ title: 'Engineer', company: 'Example' }] }));
    repo.updateProfile.mockImplementation(value => of(value));
    const fixture = TestBed.createComponent(ProfileComponent);
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
    const button = (text: string) => [...fixture.nativeElement.querySelectorAll('button')].find((b: unknown) => (b as HTMLButtonElement).textContent?.trim() === text) as HTMLButtonElement;
    await settle(); fixture.nativeElement.querySelector('[aria-label="Edit work experience"]').click(); await settle();
    button('Remove experience').click(); await settle(); button('Cancel').click(); await settle();
    expect(repo.updateProfile).not.toHaveBeenCalled(); expect(fixture.nativeElement.textContent).toContain('Engineer');
    fixture.nativeElement.querySelector('[aria-label="Edit work experience"]').click(); await settle();
    button('Remove experience').click(); await settle(); button('Save').click(); await settle();
    expect(repo.updateProfile.mock.calls[0][0].workExperiences).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No work experience added yet.');
  });
});
