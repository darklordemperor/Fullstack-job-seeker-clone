import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import { SAVE_PROFILE } from '../../../core/di/use-case.tokens';
import { JOB_SEEKER_REPOSITORY } from '../../../core/di/repository.tokens';
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
  withMethods((store, repo = inject(JOB_SEEKER_REPOSITORY), toast = inject(ToastService), saveProfile = inject(SAVE_PROFILE)) => ({
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
    async save(profile: JobSeekerProfile): Promise<boolean> {
      if (store.loading()) return false;
      patchState(store, { loading: true, error: null });
      try {
        const updated = await firstValueFrom(saveProfile.execute(profile));
        patchState(store, { profile: updated });
        toast.success('Profile updated');
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save your profile. Please retry.';
        patchState(store, { error: message });
        toast.error(message);
        return false;
      } finally {
        patchState(store, { loading: false });
      }
    },
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
