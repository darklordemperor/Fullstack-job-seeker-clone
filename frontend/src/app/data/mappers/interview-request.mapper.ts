import { InterviewProposal } from '../../domain/interview.model';
export function toInterviewRequest(value: InterviewProposal): InterviewProposal {
  return { mode: value.mode, location: value.location, timezone: value.timezone,
    slots: value.slots.map(slot => ({ startsAt: slot.startsAt, endsAt: slot.endsAt })) };
}
