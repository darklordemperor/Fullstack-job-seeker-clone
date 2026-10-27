import { InjectionToken, inject } from '@angular/core';
import { ScheduleInterviewUseCase } from '../../application/use-cases/schedule-interview.use-case';
import { INTERVIEW_REPOSITORY } from './repository.tokens';
export const SCHEDULE_INTERVIEW = new InjectionToken<ScheduleInterviewUseCase>('ScheduleInterview', {
  providedIn: 'root', factory: () => new ScheduleInterviewUseCase(inject(INTERVIEW_REPOSITORY)),
});
import { ReviewApplicantUseCase } from '../../application/use-cases/review-applicant.use-case';
import { EMPLOYER_REPOSITORY, JOB_SEEKER_REPOSITORY } from './repository.tokens';
import { SaveProfileUseCase } from '../../application/use-cases/save-profile.use-case';

export const SAVE_PROFILE = new InjectionToken<SaveProfileUseCase>('SaveProfile', {
  providedIn: 'root',
  factory: () => new SaveProfileUseCase(inject(JOB_SEEKER_REPOSITORY)),
});

export const REVIEW_APPLICANT = new InjectionToken<ReviewApplicantUseCase>('ReviewApplicant', {
  providedIn: 'root',
  factory: () => new ReviewApplicantUseCase(inject(EMPLOYER_REPOSITORY)),
});
