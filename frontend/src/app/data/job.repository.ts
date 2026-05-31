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
      .set('size', filters.size ?? 8);
    if (filters.q) {
      params = params.set('q', filters.q);
    }
    if (filters.location) {
      params = params.set('location', filters.location);
    }
    return this.http.get<ApiResponse<PagedResponse<Job>>>(`${this.apiUrl}/jobs`, { params }).pipe(
      map((response) => response.data.content.length > 0 || response.data.totalElements > 0
        ? { ...response.data, content: response.data.content.map((job) => this.decorate(job)) }
        : this.page(sampleJobs, filters)),
      catchError(() => of(this.page(sampleJobs, filters))),
    );
  }

  findById(id: string): Observable<Job> {
    return this.http.get<ApiResponse<Job>>(`${this.apiUrl}/jobs/${id}`).pipe(
      map((response) => response.data),
      catchError(() => of(sampleJobs.find((job) => job.id === id) ?? sampleJobs[0])),
    );
  }

  private page(jobs: Job[], filters: JobFilter): PagedResponse<Job> {
    const query = filters.q?.trim().toLowerCase();
    const location = filters.location?.trim().toLowerCase();
    const content = jobs.filter((job) => {
      const searchable = [job.title, job.companyName, job.description, job.industry].filter(Boolean).join(' ').toLowerCase();
      return (!query || searchable.includes(query))
        && (!location || job.location?.toLowerCase().includes(location));
    });
    const page = filters.page ?? 0;
    return { content: content.slice(page * 8, page * 8 + 8), totalElements: content.length, totalPages: Math.max(1, Math.ceil(content.length / 8)), page };
  }

  private decorate(job: Job): Job {
    return {
      ...job,
      companyName: job.companyName ?? 'JobsDB Partner Company',
      industry: job.industry ?? 'General business',
    };
  }
}
