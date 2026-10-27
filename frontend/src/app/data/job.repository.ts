import { JobRepositoryPort } from '../domain/repositories/job.repository.port';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './dto/api-response';
import { PagedResponse } from '../domain/page.model';
import { Job, JobFilter } from '../domain/job.model';
import { sampleJobs } from './sample-data';

@Injectable({ providedIn: 'root' })
export class JobRepository implements JobRepositoryPort {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  fetch(filters: JobFilter): Observable<PagedResponse<Job>> {
    if (environment.demoMode) {
      const jobs = sampleJobs.filter(job => (!filters.q || `${job.title} ${job.description} ${job.companyName}`.toLowerCase().includes(filters.q.toLowerCase()))
        && (!filters.location || job.location?.toLowerCase().includes(filters.location.toLowerCase())));
      const page = Math.max(0, filters.page ?? 0), size = Math.max(1, Math.min(8, filters.size ?? 8));
      return of({ content: jobs.slice(page * size, (page + 1) * size), page, totalElements: jobs.length, totalPages: Math.max(1, Math.ceil(jobs.length / size)) });
    }
    let params = new HttpParams().set('page', filters.page ?? 0).set('size', filters.size ?? 8);
    if (filters.q) params = params.set('q', filters.q);
    if (filters.location) params = params.set('location', filters.location);
    return this.http.get<ApiResponse<PagedResponse<Job>>>(`${this.apiUrl}/jobs`, { params }).pipe(map(response => response.data));
  }
  findById(id: string): Observable<Job> {
    if (environment.demoMode) {
      const job = sampleJobs.find(value => value.id === id);
      return job ? of(job) : throwError(() => new Error('Job not found'));
    }
    return this.http.get<ApiResponse<Job>>(`${this.apiUrl}/jobs/${id}`).pipe(map(response => response.data));
  }
}
