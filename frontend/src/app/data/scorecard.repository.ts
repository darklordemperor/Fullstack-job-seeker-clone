import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ScorecardRepositoryPort } from '../domain/repositories/scorecard.repository.port';
import { Scorecard, ScorecardFeedback } from '../domain/scorecard.model';
import { PagedResponse } from '../domain/page.model';
import { ApiResponse } from './dto/api-response';
import { toScorecardRequest } from './mappers/scorecard-request.mapper';
@Injectable({ providedIn: 'root' })
export class ScorecardRepository implements ScorecardRepositoryPort {
  private readonly http = inject(HttpClient);
  private url(id: string) { return `${environment.apiUrl}/employer/interviews/${encodeURIComponent(id)}/scorecard`; }
  get(id: string) { return this.http.get<ApiResponse<Scorecard | null>>(this.url(id)).pipe(map(r => r.data)); }
  save(id: string, version: number, feedback: ScorecardFeedback, finalize: boolean) {
    const body = toScorecardRequest(version, feedback);
    const request = finalize ? this.http.post<ApiResponse<Scorecard>>(this.url(id) + '/finalize', body) : this.http.put<ApiResponse<Scorecard>>(this.url(id), body);
    return request.pipe(map(r => r.data));
  }
  history(id: string, page: number) { return this.http.get<ApiResponse<PagedResponse<Scorecard>>>(this.url(id) + '/history', { params: { page, size: 8 } }).pipe(map(r => r.data)); }
}
