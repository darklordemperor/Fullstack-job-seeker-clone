import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { JOB_SEEKER_REPOSITORY } from '../../../core/di/repository.tokens';
import { JobSeekerProfile } from '../../../domain/job-seeker-profile.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ProfileStore } from './profile.store';

describe('ProfileStore', () => {
  const profile: JobSeekerProfile = { fullName: 'Candidate', summary: 'Summary', phone: '123', resumeUrl: 'https://example.com/cv', expectedSalary: { min: 1, max: 2, currency: 'THB' }, skills: [{ name: 'Angular' }], workExperiences: [{ company: 'Company', title: 'Engineer' }], educations: [{ institution: 'College' }], languages: [], licenses: [] };
  const repo = { profile: vi.fn(), updateProfile: vi.fn(), uploadProfileImage: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [ProfileStore, { provide: JOB_SEEKER_REPOSITORY, useValue: repo }, { provide: ToastService, useValue: toast }] });
  });
  it('keeps the saved profile on failure and clears the error after a successful retry', async () => {
    repo.profile.mockReturnValue(of(profile));
    const store = TestBed.inject(ProfileStore); expect(store.completeness()).toBe(0);
    store.loadData(); expect(store.completeness()).toBe(100);
    repo.updateProfile.mockReturnValue(throwError(() => new Error('Save unavailable')));
    await store.save({ ...profile, fullName: 'Edited' });
    expect(store.profile()?.fullName).toBe('Candidate'); expect(store.error()).toBe('Save unavailable');
    expect(store.loading()).toBe(false); expect(toast.success).not.toHaveBeenCalled();
    repo.updateProfile.mockReturnValue(of({ ...profile, fullName: 'Edited' })); await store.save(profile);
    expect(store.profile()?.fullName).toBe('Edited'); expect(store.error()).toBeNull();
  });
  it('reports load/upload errors and replaces the avatar only after success', () => {
    const store = TestBed.inject(ProfileStore);
    repo.profile.mockReturnValue(throwError(() => new Error('Load unavailable'))); store.loadData();
    expect(store.profile()).toBeNull(); expect(store.loading()).toBe(false);
    repo.uploadProfileImage.mockReturnValue(throwError(() => new Error('Invalid image')));
    const file = new File(['x'], 'avatar.png'); store.uploadImage(file);
    expect(store.error()).toBe('Invalid image'); expect(toast.error).toHaveBeenCalledWith('Invalid image');
    const upload = new Subject<JobSeekerProfile>(); repo.uploadProfileImage.mockReturnValue(upload);
    store.uploadImage(file); expect(store.loading()).toBe(true);
    upload.next({ ...profile, profileImageUrl: '/uploads/new.png' }); upload.complete();
    expect(store.profile()?.profileImageUrl).toBe('/uploads/new.png'); expect(store.error()).toBeNull();
  });
});
