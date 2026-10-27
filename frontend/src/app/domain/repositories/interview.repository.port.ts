import { Observable } from 'rxjs';
import { CalendarFile, Interview, InterviewProposal, InterviewViewer, InterviewAction, InterviewRevision } from '../interview.model';
import { PagedResponse } from '../page.model';
export interface InterviewRepositoryPort {
  detail(viewer: InterviewViewer, id: string): Observable<Interview>;
  list(viewer: InterviewViewer, upcoming: boolean, page: number): Observable<PagedResponse<Interview>>;
  propose(applicationId: string, proposal: InterviewProposal): Observable<Interview>;
  reschedule(id: string, version: number, proposal: InterviewProposal): Observable<Interview>;
  decide(viewer: InterviewViewer, id: string, action: InterviewAction, version: number, slotId?: string): Observable<Interview>;
  history(viewer: InterviewViewer, id: string, page: number): Observable<PagedResponse<InterviewRevision>>;
  calendar(viewer: InterviewViewer, id: string): Observable<CalendarFile>;
}
