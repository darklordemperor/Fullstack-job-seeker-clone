import { Observable } from 'rxjs';
import { Scorecard, ScorecardFeedback } from '../scorecard.model';
import { PagedResponse } from '../page.model';
export interface ScorecardRepositoryPort {
  get(interviewId: string): Observable<Scorecard | null>;
  save(interviewId: string, expectedVersion: number, feedback: ScorecardFeedback, finalize: boolean): Observable<Scorecard>;
  history(interviewId: string, page: number): Observable<PagedResponse<Scorecard>>;
}
