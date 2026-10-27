import type { Observable } from 'rxjs';
import { PagedResponse } from '../page.model';
import { Job, JobFilter } from '../job.model';

export interface JobRepositoryPort {
  fetch(filters: JobFilter): Observable<PagedResponse<Job>>;
  findById(id: string): Observable<Job>;
}
