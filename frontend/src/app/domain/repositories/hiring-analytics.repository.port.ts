import { Observable } from 'rxjs';
import { AnalyticsFilters, HiringAnalytics } from '../analytics.model';
export interface HiringAnalyticsRepositoryPort { report(filters: AnalyticsFilters): Observable<HiringAnalytics>; }
