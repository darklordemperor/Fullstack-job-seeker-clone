import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ResumeRepository } from './resume.repository';
describe('Private résumé HTTP contract', () => {
  let repo: ResumeRepository, http: HttpTestingController;
  const url = '/api/job-seeker/resumes';
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); repo = TestBed.inject(ResumeRepository); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('uploads multipart bytes without owner fields and preserves empty lists', async () => {
    const file = new File(['pdf'], 'cv.pdf', { type: 'application/pdf' });
    const uploading = firstValueFrom(repo.upload(file)); const request = http.expectOne(url);
    expect(request.request.method).toBe('POST'); expect(request.request.body.get('file')).toBe(file);
    expect([...request.request.body.keys()]).toEqual(['file']);
    request.flush({ data: { id: 'one' } }); expect(await uploading).toEqual({ id: 'one' });
    const list = firstValueFrom(repo.list()); http.expectOne(url).flush({ data: [] }); expect(await list).toEqual([]);
  });
  it('uses private binary endpoints and encoded identifiers', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    const own = firstValueFrom(repo.download('a/b')); const r = http.expectOne(url + '/a%2Fb/file'); expect(r.request.responseType).toBe('blob'); r.flush(blob); expect(await own).toBe(blob);
    for (const employer of [false, true]) {
      const download = firstValueFrom(repo.applicationDownload('app', employer));
      http.expectOne(`/api/${employer ? 'employer/' : ''}applications/app/resume`).flush(blob); expect(await download).toBe(blob);
    }
  });
  it('selects, clears and deletes, and propagates server rejection', async () => {
    const selecting = firstValueFrom(repo.select('id')); const r = http.expectOne(url + '/id/current'); expect(r.request.method).toBe('PUT'); r.flush({ data: null }); await selecting;
    const clearing = firstValueFrom(repo.clear()); const c = http.expectOne(url + '/current'); expect(c.request.method).toBe('DELETE'); c.flush({ data: null }); await clearing;
    const removing = firstValueFrom(repo.remove('id')); const assertion = expect(removing).rejects.toThrow();
    http.expectOne(url + '/id').flush({ message: 'Retained' }, { status: 409, statusText: 'Conflict' }); await assertion;
  });
});
