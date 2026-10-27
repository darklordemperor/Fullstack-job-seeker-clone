import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { RESUME_REPOSITORY } from '../../../core/di/repository.tokens';
import { ResumeVersion } from '../../../domain/resume.model';
import { ResumesStore } from './resumes.store';
const item: ResumeVersion = { id: 'one', fileName: 'cv.pdf', sizeBytes: 20, createdAt: '2026-10-25T00:00:00Z', current: true, attached: false };
const file = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' });
describe('Résumé workflow state', () => {
  const repo = { list: vi.fn(), upload: vi.fn(), select: vi.fn(), clear: vi.fn(), remove: vi.fn() };
  const setup = () => { TestBed.configureTestingModule({ providers: [ResumesStore, { provide: RESUME_REPOSITORY, useValue: repo }] }); return TestBed.inject(ResumesStore); };
  beforeEach(() => { vi.resetAllMocks(); repo.list.mockReturnValue(of([item])); });
  it('keeps one selection and retains earlier versions through upload, selection and deletion', async () => {
    const store = setup(); await store.load(); repo.upload.mockReturnValue(of({ ...item, id: 'two' }));
    expect(await store.upload(file)).toBe(true); expect(store.items().filter(r => r.current).map(r => r.id)).toEqual(['two']);
    repo.select.mockReturnValue(of(undefined)); await store.select(item); expect(store.items().filter(r => r.current).map(r => r.id)).toEqual(['one']);
    repo.clear.mockReturnValue(of(undefined)); await store.clear(); expect(store.items().some(r => r.current)).toBe(false);
    repo.remove.mockReturnValue(of(undefined)); expect(await store.remove(item)).toBe(true); expect(store.items().map(r => r.id)).toEqual(['two']);
  });
  it('validates files and preserves history on upload/delete errors', async () => {
    const store = setup(); await store.load(); expect(await store.upload(new File([], 'bad.pdf'))).toBe(false); expect(repo.upload).not.toHaveBeenCalled();
    repo.upload.mockReturnValue(throwError(() => ({ error: { message: 'Limit reached' } }))); expect(await store.upload(file)).toBe(false); expect(store.actionError()).toBe('Limit reached');
    repo.remove.mockReturnValue(throwError(() => new Error('Retained'))); expect(await store.remove(item)).toBe(false); expect(store.items()).toEqual([item]);
    repo.list.mockReturnValue(throwError(() => null)); await store.load(); expect(store.error()).toContain('Unable'); expect(await store.upload(file)).toBe(false);
  });
  it('ignores stale reads and prevents duplicate mutations and writes after disposal', async () => {
    const store = setup(); const old = new Subject<ResumeVersion[]>(); repo.list.mockReturnValueOnce(old); const loading = store.load();
    expect(await store.upload(file)).toBe(false); await store.load(); old.next([]); await loading; expect(store.items()).toEqual([item]);
    const pending = new Subject<ResumeVersion>(); repo.upload.mockReturnValue(pending); const uploading = store.upload(file);
    expect(await store.upload(file)).toBe(false); await store.load(); store.dispose(); pending.next({ ...item, id: 'two' }); expect(await uploading).toBe(false); expect(store.items()).toEqual([item]);
  });
});
