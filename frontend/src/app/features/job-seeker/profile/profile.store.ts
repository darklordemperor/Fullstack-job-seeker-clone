import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { JobSeekerRepository } from '../../../data/job-seeker.repository';
import { JobSeekerProfile } from '../../../domain/job-seeker-profile.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';

interface ProfileState {
  profile: JobSeekerProfile | null;
  loading: boolean;
  error: string | null;
}

export const ProfileStore = signalStore(
  withState<ProfileState>({ profile: null, loading: false, error: null }),
  withComputed(({ profile }) => ({
    completeness: computed(() => {
      const current = profile();
      if (!current) {
        return 0;
      }
      const checks = [current.fullName, current.phone, current.summary, current.resumeUrl, current.skills.length, current.workExperiences.length, current.educations.length];
      return Math.round((checks.filter(Boolean).length / checks.length) * 100);
    }),
  })),
  withMethods((store, repo = inject(JobSeekerRepository), toast = inject(ToastService)) => ({
    loadData: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() =>
          repo.profile().pipe(
            tapResponse({
              next: (profile) => patchState(store, { profile, loading: false, error: null }),
              error: (err: Error) => patchState(store, { error: err.message, loading: false }),
            }),
          ),
        ),
      ),
    ),
    save: rxMethod<JobSeekerProfile>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap((profile) =>
          repo.updateProfile(profile).pipe(
            tapResponse({
              next: (updated) => {
                patchState(store, { profile: updated, loading: false });
                toast.success('Profile updated');
              },
              error: (err: Error) => {
                patchState(store, { error: err.message, loading: false });
                toast.error(err.message);
              },
            }),
          ),
        ),
      ),
    ),
    uploadImage: rxMethod<File>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap((file) =>
          repo.uploadProfileImage(file).pipe(
            tapResponse({
              next: (profile) => {
                patchState(store, { profile, loading: false, error: null });
                toast.success('Profile image updated');
              },
              error: (err: Error) => {
                patchState(store, { error: err.message, loading: false });
                toast.error(err.message);
              },
            }),
          ),
        ),
      ),
    ),
  })),
);
