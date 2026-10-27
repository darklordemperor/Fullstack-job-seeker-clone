import { Observable } from 'rxjs';
import { SavedSearch, SavedSearchInput } from '../saved-search.model';
import { Job } from '../job.model';
import { PagedResponse } from '../page.model';
export interface SavedSearchRepositoryPort {
  list(): Observable<SavedSearch[]>;
  create(input: SavedSearchInput): Observable<SavedSearch>;
  setEnabled(id: string, enabled: boolean): Observable<SavedSearch>;
  remove(id: string): Observable<void>;
  matches(id: string, page: number): Observable<PagedResponse<Job>>;
}
