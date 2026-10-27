import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { RESUME_REPOSITORY } from '../../core/di/repository.tokens';
import { ResumeDownloadComponent } from './resume-download.component';
describe('Authenticated résumé downloads', () => {
  const repo = { download: vi.fn(), applicationDownload: vi.fn() };
  beforeEach(() => { vi.resetAllMocks(); TestBed.configureTestingModule({ providers: [{ provide: RESUME_REPOSITORY, useValue: repo }] }); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('downloads the submitted bytes through the role-scoped repository and revokes the object URL', async () => {
    const blob = new Blob(['pdf']); repo.applicationDownload.mockReturnValue(of(blob));
    const create = vi.fn(() => 'blob:test'), revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const f = TestBed.createComponent(ResumeDownloadComponent); f.componentRef.setInput('resume', { id: 'r', fileName: 'original.pdf' }); f.componentRef.setInput('applicationId', 'app'); f.componentRef.setInput('employer', true); f.detectChanges();
    f.nativeElement.querySelector('button').click(); await f.whenStable();
    expect(repo.applicationDownload).toHaveBeenCalledWith('app', true); expect(create).toHaveBeenCalledWith(blob); expect(click).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:test'), { timeout: 2000 });
  });
  it('disables repeat clicks while downloading and reports failure without opening a URL', async () => {
    const pending = new Subject<Blob>(); repo.download.mockReturnValue(pending);
    const f = TestBed.createComponent(ResumeDownloadComponent); f.componentRef.setInput('resume', { id: 'r', fileName: 'cv.pdf' }); f.detectChanges();
    f.nativeElement.querySelector('button').click(); f.detectChanges(); expect(f.nativeElement.querySelector('button').disabled).toBe(true);
    pending.error(new Error('Forbidden')); await f.whenStable(); f.detectChanges(); expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('Unable to download');
    repo.download.mockReturnValue(throwError(() => new Error('Offline'))); f.nativeElement.querySelector('button').click(); await f.whenStable(); expect(repo.download).toHaveBeenCalledTimes(2);
  });
});
