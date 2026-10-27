export type InterviewViewer = 'employer' | 'job-seeker';
export type InterviewStatus = 'PROPOSED' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export interface InterviewSlot { id: string; startsAt: string; endsAt: string; }
export interface Interview {
  id: string; applicationId: string; jobTitle: string; companyName: string; candidateName: string;
  status: InterviewStatus; mode: 'ONLINE' | 'IN_PERSON'; location: string; timezone: string;
  slots: InterviewSlot[]; selectedSlotId: string | null; version: number; updatedAt: string; round: number;
}
export interface InterviewProposal {
  mode: 'ONLINE' | 'IN_PERSON'; location: string; timezone: string;
  slots: { startsAt: string; endsAt: string }[];
}
export interface CalendarFile { filename: string; content: string; }

export type InterviewAction = 'accept' | 'decline' | 'cancel' | 'complete' | 'no-show';
export interface InterviewRevision {
  version: number; event: string; occurredAt: string;
  snapshot: Pick<Interview, 'status' | 'mode' | 'location' | 'timezone' | 'slots' | 'selectedSlotId'>;
}
