import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './dto/api-response';
import { AnalyticsFilters, HiringAnalytics } from '../domain/analytics.model';
import { HiringAnalyticsRepositoryPort } from '../domain/repositories/hiring-analytics.repository.port';
@Injectable({ providedIn: 'root' })
export class HiringAnalyticsRepository implements HiringAnalyticsRepositoryPort {
  private readonly http = inject(HttpClient);
  report(filters: AnalyticsFilters) {
    const params = { from: filters.from, to: filters.to, ...(filters.jobId ? { jobId: filters.jobId } : {}) };
    return this.http.get<ApiResponse<HiringAnalytics>>(`${environment.apiUrl}/employer/analytics`, { params }).pipe(map(r => r.data));
  }
}
