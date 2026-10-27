import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ScorecardRepository } from './scorecard.repository';
import { emptyScorecardFeedback } from '../domain/scorecard.rules';
describe('Scorecard HTTP contract', () => {
  let repo: ScorecardRepository, http: HttpTestingController;
  const url = '/api/employer/interviews/a%2Fb/scorecard';
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); repo = TestBed.inject(ScorecardRepository); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('preserves absent cards and pages revisions', async () => {
    const result = firstValueFrom(repo.get('a/b')); http.expectOne(url).flush({ data: null }); expect(await result).toBeNull();
    const history = firstValueFrom(repo.history('a/b', 2)); http.expectOne(url + '/history?page=2&size=8').flush({ data: { content: [], page: 2, totalPages: 1, totalElements: 0 } }); expect((await history).content).toEqual([]);
  });
  it('maps only allowed request fields, trims notes and propagates conflicts', async () => {
    const feedback = { ...emptyScorecardFeedback(), strengths: ' Evidence ', actorId: 'never-send' };
    const saving = firstValueFrom(repo.save('a/b', 1, feedback, false)); const req = http.expectOne(url);
    expect(req.request.method).toBe('PUT'); expect(req.request.body).toEqual({ expectedVersion: 1, feedback: { ...emptyScorecardFeedback(), strengths: 'Evidence' } });
    req.flush({ data: { version: 2 } }); expect(await saving).toEqual({ version: 2 });
    const final = firstValueFrom(repo.save('a/b', 2, feedback, true)); const assertion = expect(final).rejects.toThrow();
    const f = http.expectOne(url + '/finalize'); expect(f.request.method).toBe('POST'); f.flush({ message: 'Stale' }, { status: 409, statusText: 'Conflict' }); await assertion;
  });
});
