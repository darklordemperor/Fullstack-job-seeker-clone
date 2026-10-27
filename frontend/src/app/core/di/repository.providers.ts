import { Provider } from '@angular/core';
import { HiringAnalyticsRepository } from '../../data/hiring-analytics.repository';
import { HIRING_ANALYTICS_REPOSITORY } from './repository.tokens';
import { ScorecardRepository } from '../../data/scorecard.repository';
import { SCORECARD_REPOSITORY } from './repository.tokens';
import { ResumeRepository } from '../../data/resume.repository';
import { RESUME_REPOSITORY } from './repository.tokens';
import { SavedSearchRepository } from '../../data/saved-search.repository';
import { SAVED_SEARCH_REPOSITORY } from './repository.tokens';
import { NotificationRepository } from '../../data/notification.repository';
import { NOTIFICATION_REPOSITORY } from './repository.tokens';
import { InterviewRepository } from '../../data/interview.repository';
import { INTERVIEW_REPOSITORY } from './repository.tokens';
import { AdminRepository } from '../../data/admin.repository';
import { AuthRepository } from '../../data/auth.repository';
import { EmployerRepository } from '../../data/employer.repository';
import { JobRepository } from '../../data/job.repository';
import { JobSeekerRepository } from '../../data/job-seeker.repository';
import { SessionRepository } from '../../data/session.repository';
import { ADMIN_REPOSITORY, AUTH_REPOSITORY, EMPLOYER_REPOSITORY, JOB_REPOSITORY, JOB_SEEKER_REPOSITORY, SESSION_REPOSITORY } from './repository.tokens';

/** Composition root: bind application contracts to the live HTTP adapters. */
export function provideRepositories(): Provider[] {
  return [
    { provide: HIRING_ANALYTICS_REPOSITORY, useExisting: HiringAnalyticsRepository },
    { provide: SCORECARD_REPOSITORY, useExisting: ScorecardRepository },
    { provide: RESUME_REPOSITORY, useExisting: ResumeRepository },
    { provide: SAVED_SEARCH_REPOSITORY, useExisting: SavedSearchRepository },
    { provide: NOTIFICATION_REPOSITORY, useExisting: NotificationRepository },
    { provide: INTERVIEW_REPOSITORY, useExisting: InterviewRepository },
    { provide: ADMIN_REPOSITORY, useExisting: AdminRepository },
    { provide: AUTH_REPOSITORY, useExisting: AuthRepository },
    { provide: EMPLOYER_REPOSITORY, useExisting: EmployerRepository },
    { provide: JOB_REPOSITORY, useExisting: JobRepository },
    { provide: JOB_SEEKER_REPOSITORY, useExisting: JobSeekerRepository },
    { provide: SESSION_REPOSITORY, useExisting: SessionRepository },
  ];
}
