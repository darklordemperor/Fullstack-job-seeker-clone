import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { HiringAnalyticsRepository } from './hiring-analytics.repository';
describe('Hiring analytics HTTP contract', () => {
  let repo: HiringAnalyticsRepository, http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); repo = TestBed.inject(HiringAnalyticsRepository); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('sends only date/job filters and preserves zero/null aggregates', async () => {
    const loading = firstValueFrom(repo.report({ from: '2024-01-01', to: '2024-01-31', jobId: '' }));
    const request = http.expectOne('/api/employer/analytics?from=2024-01-01&to=2024-01-31'); expect(request.request.method).toBe('GET');
    request.flush({ data: { applications: 0, timeToHire: { medianDays: null } } }); expect(await loading).toEqual({ applications: 0, timeToHire: { medianDays: null } });
  });
  it('scopes by job and propagates permission failures', async () => {
    const loading = firstValueFrom(repo.report({ from: '2024-01-01', to: '2024-01-31', jobId: 'id' })); const assertion = expect(loading).rejects.toThrow();
    http.expectOne('/api/employer/analytics?from=2024-01-01&to=2024-01-31&jobId=id').flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' }); await assertion;
  });
});
