import { firstValueFrom, of, throwError } from 'rxjs';
import { JobApplication } from '../../domain/application.model';
import { ReviewApplicantUseCase } from './review-applicant.use-case';

describe('ReviewApplicantUseCase without Angular', () => {
  const application: JobApplication = { id: 'a', jobId: 'j', jobSeekerId: 's', status: 'REVIEWING', appliedAt: '2026-10-23' };
  const command = { applicationId: 'a', expectedStatus: 'SUBMITTED' as const, status: 'REVIEWING' as const, reason: ' Review ' };

  it('sends the expected state and a trimmed private note', async () => {
    const repository = { moveApplicant: vi.fn(() => of(application)) };
    expect(await firstValueFrom(new ReviewApplicantUseCase(repository).execute(command))).toEqual(application);
    expect(repository.moveApplicant).toHaveBeenCalledWith('a', 'SUBMITTED', 'REVIEWING', 'Review');
  });

  it.each(['', '  ', 'x'.repeat(2001)])('rejects an invalid note before accessing the repository', async reason => {
    const repository = { moveApplicant: vi.fn(() => of(application)) };
    await expect(firstValueFrom(new ReviewApplicantUseCase(repository).execute({ ...command, reason }))).rejects.toThrow('note');
    expect(repository.moveApplicant).not.toHaveBeenCalled();
  });

  it('rejects transitions from a terminal state', async () => {
    const repository = { moveApplicant: vi.fn(() => of(application)) };
    await expect(firstValueFrom(new ReviewApplicantUseCase(repository).execute({ ...command, expectedStatus: 'HIRED' }))).rejects.toThrow('not allowed');
    expect(repository.moveApplicant).not.toHaveBeenCalled();
  });

  it('preserves server conflicts instead of manufacturing a successful update', async () => {
    const conflict = new Error('Application changed');
    const repository = { moveApplicant: vi.fn(() => throwError(() => conflict)) };
    await expect(firstValueFrom(new ReviewApplicantUseCase(repository).execute(command))).rejects.toBe(conflict);
  });
});
