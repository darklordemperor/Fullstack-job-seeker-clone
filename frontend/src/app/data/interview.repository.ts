import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './dto/api-response';
import { InterviewRepositoryPort } from '../domain/repositories/interview.repository.port';
import { CalendarFile, Interview, InterviewProposal, InterviewViewer, InterviewAction, InterviewRevision } from '../domain/interview.model';
import { PagedResponse } from '../domain/page.model';
import { toInterviewRequest } from './mappers/interview-request.mapper';

@Injectable({ providedIn: 'root' })
export class InterviewRepository implements InterviewRepositoryPort {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;
  private unwrap<T>(response: Observable<ApiResponse<T>>): Observable<T> {
    return response.pipe(map(value => value.data), catchError((error: HttpErrorResponse) =>
      throwError(() => new Error(typeof error.error?.message === 'string' ? error.error.message : 'Unable to reach the interview service. Please try again.'))));
  }
  list(viewer: InterviewViewer, upcoming: boolean, page: number): Observable<PagedResponse<Interview>> {
    return this.unwrap(this.http.get<ApiResponse<PagedResponse<Interview>>>(`${this.url}/${viewer}/interviews`, { params: { upcoming, page, size: 8 } }));
  }
  detail(viewer: InterviewViewer, id: string): Observable<Interview> {
    return this.unwrap(this.http.get<ApiResponse<Interview>>(`${this.url}/${viewer}/interviews/${encodeURIComponent(id)}`));
  }
  propose(applicationId: string, proposal: InterviewProposal): Observable<Interview> {
    return this.unwrap(this.http.post<ApiResponse<Interview>>(`${this.url}/employer/applications/${applicationId}/interviews`, toInterviewRequest(proposal)));
  }
  reschedule(id: string, version: number, proposal: InterviewProposal): Observable<Interview> {
    return this.unwrap(this.http.put<ApiResponse<Interview>>(`${this.url}/employer/interviews/${id}`, toInterviewRequest(proposal), { params: { expectedVersion: version } }));
  }
  decide(viewer: InterviewViewer, id: string, action: InterviewAction, version: number, slotId?: string): Observable<Interview> {
    const outcome = action === 'complete' ? 'COMPLETED' : action === 'no-show' ? 'NO_SHOW' : null;
    return this.unwrap(this.http.post<ApiResponse<Interview>>(`${this.url}/${viewer}/interviews/${id}/${outcome ? 'outcome' : action}`,
      outcome ? { expectedVersion: version, outcome } : { expectedVersion: version, ...(slotId ? { slotId } : {}) }));
  }
  history(viewer: InterviewViewer, id: string, page: number): Observable<PagedResponse<InterviewRevision>> {
    return this.unwrap(this.http.get<ApiResponse<PagedResponse<InterviewRevision>>>(`${this.url}/${viewer}/interviews/${id}/history`, { params: { page, size: 10 } }));
  }
  calendar(viewer: InterviewViewer, id: string): Observable<CalendarFile> {
    return this.unwrap(this.http.get<ApiResponse<CalendarFile>>(`${this.url}/${viewer}/interviews/${id}/calendar`));
  }
}
