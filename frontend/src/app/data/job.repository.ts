import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, PagedResponse } from '../domain/api-response.model';
import { Job, JobFilter } from '../domain/job.model';
import { sampleJobs } from './sample-data';

@Injectable({ providedIn: 'root' })
export class JobRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  fetch(filters: JobFilter): Observable<PagedResponse<Job>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 20);
    if (filters.q) {
      params = params.set('q', filters.q);
    }
    return this.http.get<ApiResponse<PagedResponse<Job>>>(`${this.apiUrl}/jobs`, { params }).pipe(
      map((response) => response.data),
      catchError(() => of({ content: sampleJobs, totalElements: sampleJobs.length, totalPages: 1, page: filters.page ?? 0 })),
    );
  }

  findById(id: string): Observable<Job> {
    return this.http.get<ApiResponse<Job>>(`${this.apiUrl}/jobs/${id}`).pipe(
      map((response) => response.data),
      catchError(() => of(sampleJobs.find((job) => job.id === id) ?? sampleJobs[0])),
    );
  }
}
