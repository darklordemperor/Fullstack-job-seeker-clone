import { defer } from 'rxjs';
import { Interview, InterviewProposal } from '../../domain/interview.model';
import { InterviewRepositoryPort } from '../../domain/repositories/interview.repository.port';
import { interviewProposalError } from '../../domain/interview.rules';
export class ScheduleInterviewUseCase {
  constructor(private readonly repo: InterviewRepositoryPort) {}
  execute(applicationId: string, proposal: InterviewProposal, existing?: Interview) {
    return defer(() => {
      const error = interviewProposalError(proposal);
      if (error) throw new Error(error);
      const normalized = { ...proposal, location: proposal.location.trim() };
      return existing ? this.repo.reschedule(existing.id, existing.version, normalized) : this.repo.propose(applicationId, normalized);
    });
  }
}
