import { Observable, throwError } from 'rxjs';
import { ApplicationStatus, JobApplication } from '../../domain/application.model';
import { nextApplicationStatuses } from '../../domain/application-transitions';
import { EmployerRepositoryPort } from '../../domain/repositories/employer.repository.port';

export interface ReviewApplicantCommand {
  applicationId: string;
  expectedStatus: ApplicationStatus;
  status: ApplicationStatus;
  reason: string;
}

export class ReviewApplicantUseCase {
  constructor(private readonly repository: Pick<EmployerRepositoryPort, 'moveApplicant'>) {}

  execute(command: ReviewApplicantCommand): Observable<JobApplication> {
    const reason = command.reason.trim();
    if (!command.applicationId || !reason || reason.length > 2000) {
      return throwError(() => new Error('Choose an application and provide a note of 1–2000 characters.'));
    }
    if (!nextApplicationStatuses(command.expectedStatus).includes(command.status)) {
      return throwError(() => new Error('This stage transition is not allowed.'));
    }
    return this.repository.moveApplicant(command.applicationId, command.expectedStatus, command.status, reason);
  }
}
