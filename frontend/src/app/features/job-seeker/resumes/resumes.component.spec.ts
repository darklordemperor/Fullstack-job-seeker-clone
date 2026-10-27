import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { RESUME_REPOSITORY } from '../../../core/di/repository.tokens';
import { ResumesComponent } from './resumes.component';
describe('Résumé workspace', () => {
  const repo = { list: vi.fn(), upload: vi.fn(), select: vi.fn(), clear: vi.fn(), remove: vi.fn(), download: vi.fn() };
  const item = { id: 'one', fileName: 'cv.pdf', sizeBytes: 20, createdAt: '2026-10-25T00:00:00Z', current: true, attached: false };
  beforeEach(() => { vi.resetAllMocks(); TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: RESUME_REPOSITORY, useValue: repo }] }); });
  it('shows loading, failure/retry and useful empty state', async () => {
    const pending = new Subject(); repo.list.mockReturnValue(pending); const f = TestBed.createComponent(ResumesComponent); f.detectChanges(); expect(f.nativeElement.textContent).toContain('Loading résumés');
    pending.error(new Error('Offline')); await f.whenStable(); f.detectChanges(); expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain('Offline');
    repo.list.mockReturnValue(of([])); f.nativeElement.querySelector('[role="alert"] button').click(); await f.whenStable(); f.detectChanges(); expect(f.nativeElement.textContent).toContain('Your next application starts here');
  });
  it('preserves the selected upload on failure, confirms deletion and hides deletion for submitted versions', async () => {
    repo.list.mockReturnValue(of([item, { ...item, id: 'retained', fileName: 'old.pdf', attached: true, current: false }]));
    repo.upload.mockReturnValue(throwError(() => new Error('Upload failed'))); repo.remove.mockReturnValue(of(undefined));
    const f = TestBed.createComponent(ResumesComponent); f.detectChanges(); await f.whenStable(); f.detectChanges(); const root = f.nativeElement as HTMLElement;
    const button = (text: string) => [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === text)!;
    const input = root.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [new File(['pdf'], 'new.pdf', { type: 'application/pdf' })] }); input.dispatchEvent(new Event('change')); f.detectChanges();
    button('Upload & use for applications').click(); await f.whenStable(); f.detectChanges(); expect(root.textContent).toContain('new.pdf'); expect(root.textContent).toContain('Upload failed');
    expect([...root.querySelectorAll('button')].filter(b => b.textContent?.trim() === 'Delete')).toHaveLength(1);
    button('Delete').click(); f.detectChanges(); button('Keep résumé').click(); f.detectChanges(); expect(repo.remove).not.toHaveBeenCalled();
    button('Delete').click(); f.detectChanges(); button('Confirm delete').click(); await f.whenStable(); f.detectChanges(); expect(repo.remove).toHaveBeenCalledWith('one'); expect(root.textContent).toContain('Unused résumé deleted');
  });
});
