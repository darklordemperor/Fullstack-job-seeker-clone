import { firstValueFrom, of, throwError } from 'rxjs';
import { ScheduleInterviewUseCase } from './schedule-interview.use-case';
import { Interview, InterviewProposal } from '../../domain/interview.model';
import { InterviewRepositoryPort } from '../../domain/repositories/interview.repository.port';
import { interviewProposalError, localDateTime, toUtc } from '../../domain/interview.rules';

describe('Interview scheduling rules', () => {
  const now = Date.now();
  const proposal: InterviewProposal = { mode: 'ONLINE', location: 'https://example.com/meet', timezone: 'Asia/Bangkok', slots: [{ startsAt: new Date(now+86400000).toISOString(), endsAt: new Date(now+90000000).toISOString() }] };
  it('accepts valid slots and rejects invalid locations, zones, durations and overlaps', () => {
    expect(interviewProposalError(proposal,now)).toBeNull();
    for (const change of [
      { location: '' }, { location: 'x'.repeat(1001) }, { location: 'http://example.com' }, { location: 'not url' },
      { location: 'https://user:pass@example.com' }, { timezone: 'Bad/Zone' }, { slots: [] }, { slots: Array(4).fill(proposal.slots[0]) },
      { slots: [proposal.slots[0], proposal.slots[0]] }, { slots: [{ startsAt: 'invalid', endsAt: 'invalid' }] },
      { slots: [{ startsAt: new Date(now-1).toISOString(), endsAt: proposal.slots[0].endsAt }] },
      { slots: [{ startsAt: proposal.slots[0].startsAt, endsAt: proposal.slots[0].startsAt }] },
    ]) expect(interviewProposalError({ ...proposal,...change },now)).not.toBeNull();
    expect(interviewProposalError({ ...proposal, mode: 'IN_PERSON', location: 'Room 1' },now)).toBeNull();
  });
  it('converts device-local times to UTC with a reversible preview and rejects normalized invalid dates', () => {
    const local='2026-12-01T10:30'; expect(localDateTime(toUtc(local))).toBe(local);
    expect(() => toUtc('bad')).toThrow(); expect(() => toUtc('2026-02-30T10:30')).toThrow();
    expect(localDateTime('invalid')).toBe('');
  });
  it('keeps scheduling orchestration independent of HTTP and forwards version on reschedule', async () => {
    const repo={ propose: vi.fn().mockReturnValue(of({})), reschedule: vi.fn().mockReturnValue(of({})) };
    const useCase=new ScheduleInterviewUseCase(repo as unknown as InterviewRepositoryPort);
    await firstValueFrom(useCase.execute('application',proposal)); expect(repo.propose).toHaveBeenCalledWith('application',proposal);
    await firstValueFrom(useCase.execute('application',proposal,{ id:'interview', version:3 } as Interview));
    expect(repo.reschedule).toHaveBeenCalledWith('interview',3,proposal);
    await expect(firstValueFrom(useCase.execute('application',{...proposal,slots:[]}))).rejects.toThrow();
    repo.propose.mockReturnValue(throwError(() => new Error('Offline')));
    await expect(firstValueFrom(useCase.execute('application',proposal))).rejects.toThrow('Offline');
  });
});
