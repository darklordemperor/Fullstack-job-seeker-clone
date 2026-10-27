import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { JobSeekerSettingsComponent } from './settings.component';
import { JOB_SEEKER_REPOSITORY } from '../../../core/di/repository.tokens';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('Persistent candidate settings', () => {
  const saved = { displayName: 'Candidate', contactEmail: 'contact@example.com', discoverable: false, recommendations: false };
  let repo: { settings: ReturnType<typeof vi.fn>; saveSettings: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    repo = { settings: vi.fn(() => of({ ...saved })), saveSettings: vi.fn(value => of(value)) };
    toast = { success: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: JOB_SEEKER_REPOSITORY, useValue: repo }, { provide: ToastService, useValue: toast }] });
  });
  it('loads saved preferences and persists edits', async () => {
    const fixture = TestBed.createComponent(JobSeekerSettingsComponent);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('[name="displayName"]') as HTMLInputElement;
    expect(input.value).toBe('Candidate');
    input.value = 'New name'; input.dispatchEvent(new Event('input'));
    await fixture.whenStable(); fixture.detectChanges(); await fixture.whenStable();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable(); fixture.detectChanges(); await fixture.whenStable();
    expect(repo.saveSettings).toHaveBeenCalledWith({ ...saved, displayName: 'New name' });
    expect(toast.success).toHaveBeenCalledOnce();
  });
  it('keeps edits and does not announce success when save fails', async () => {
    repo.saveSettings.mockReturnValue(throwError(() => new Error('Offline')));
    const fixture = TestBed.createComponent(JobSeekerSettingsComponent);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); await fixture.whenStable();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable(); fixture.detectChanges(); await fixture.whenStable();
    expect(toast.success).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[name="displayName"]').value).toBe('Candidate');
    expect(fixture.nativeElement.querySelector('button[type="submit"], form button').disabled).toBe(false);
  });
  it('shows a retry state when loading fails', async () => {
    repo.settings.mockReturnValue(throwError(() => new Error('Offline')));
    const fixture = TestBed.createComponent(JobSeekerSettingsComponent);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Unable to load');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
});
