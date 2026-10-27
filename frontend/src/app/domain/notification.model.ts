export interface InboxNotification {
  id: string;
  kind: 'JOB_MATCH' | 'NEW_APPLICATION' | 'APPLICATION_STATUS' | 'INTERVIEW_PROPOSED' | 'INTERVIEW_RESCHEDULED'
    | 'INTERVIEW_CONFIRMED' | 'INTERVIEW_DECLINED' | 'INTERVIEW_CANCELLED' | 'INTERVIEW_COMPLETED' | 'INTERVIEW_NO_SHOW';
  title: string;
  message: string;
  href: string;
  createdAt: string;
  readAt: string | null;
}
