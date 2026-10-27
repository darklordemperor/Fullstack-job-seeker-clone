import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './dto/api-response';
import { SavedSearchRepositoryPort } from '../domain/repositories/saved-search.repository.port';
import { SavedSearch, SavedSearchInput } from '../domain/saved-search.model';
import { Job } from '../domain/job.model';
import { PagedResponse } from '../domain/page.model';
import { savedSearchRequest } from './mappers/saved-search.mapper';
@Injectable({ providedIn: 'root' })
export class SavedSearchRepository implements SavedSearchRepositoryPort {
  private readonly http=inject(HttpClient);
  private readonly url=`${environment.apiUrl}/job-seeker/saved-searches`;
  private unwrap<T>(request: Observable<ApiResponse<T>>): Observable<T> {
    return request.pipe(map(response=>response.data),catchError((error: HttpErrorResponse)=>throwError(()=>new Error(
      error.status===409 ? 'These criteria already exist, or you have reached the 20-search limit.' :
      error.status===404 ? 'This saved search is no longer available.' : 'Unable to update or load saved searches. Please try again.'))));
  }
  list() { return this.unwrap(this.http.get<ApiResponse<SavedSearch[]>>(this.url)); }
  create(input: SavedSearchInput) { return this.unwrap(this.http.post<ApiResponse<SavedSearch>>(this.url,savedSearchRequest(input))); }
  setEnabled(id: string, enabled: boolean) { return this.unwrap(this.http.patch<ApiResponse<SavedSearch>>(`${this.url}/${encodeURIComponent(id)}`,{enabled})); }
  remove(id: string) { return this.unwrap(this.http.delete<ApiResponse<void>>(`${this.url}/${encodeURIComponent(id)}`)); }
  matches(id: string,page: number) { return this.unwrap(this.http.get<ApiResponse<PagedResponse<Job>>>(`${this.url}/${encodeURIComponent(id)}/jobs`,{params:{page}})); }
}
