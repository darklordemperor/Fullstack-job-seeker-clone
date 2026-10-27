import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { INTERVIEW_REPOSITORY, SCORECARD_REPOSITORY } from '../../../core/di/repository.tokens';
import { ScorecardComponent } from './scorecard.component';
describe('Scorecard workspace', () => {
  const repo = { get: vi.fn(), save: vi.fn(), history: vi.fn() }, interviews = { detail: vi.fn() };
  const card = { interviewId: 'one', version: 1, status: 'DRAFT', feedback: { technicalSkills: 4, communication: 3, problemSolving: 5, strengths: 'Observed evidence', concerns: '', recommendation: 'HIRE' }, updatedAt: '2026-10-25T00:00:00Z', finalizedAt: null };
  beforeEach(() => {
    vi.resetAllMocks(); repo.get.mockReturnValue(of(card)); repo.history.mockReturnValue(of({ content: [card], page: 0, totalPages: 1 })); interviews.detail.mockReturnValue(of({ id: 'one', candidateName: 'Candidate', jobTitle: 'Engineer', round: 1, status: 'COMPLETED' }));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'one' }) } } }, { provide: SCORECARD_REPOSITORY, useValue: repo }, { provide: INTERVIEW_REPOSITORY, useValue: interviews }] });
  });
  it('requires explicit finalization confirmation and renders immutable feedback and revision dialog', async () => {
    repo.save.mockReturnValue(of({ ...card, version: 2, status: 'FINALIZED' }));
    const f = TestBed.createComponent(ScorecardComponent); f.detectChanges(); await f.whenStable(); f.detectChanges(); const root = f.nativeElement as HTMLElement;
    const button = (text: string) => [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === text)!;
    await vi.waitFor(() => { f.detectChanges(); expect(button('Review & finalize')).toBeDefined(); });
    button('Review & finalize').click(); f.detectChanges(); expect(repo.save).not.toHaveBeenCalled();
    button('Keep editing').click(); f.detectChanges(); expect(root.querySelector('[role=dialog]')).toBeNull();
    button('Review & finalize').click(); f.detectChanges(); button('Finalize scorecard').click(); await f.whenStable(); f.detectChanges();
    expect(repo.save).toHaveBeenCalledWith('one', 1, card.feedback, true); expect(root.querySelector('fieldset')?.disabled).toBe(true); expect(root.textContent).toContain('cannot be changed');
    root.querySelector<HTMLButtonElement>('[aria-label="View scorecard revision 1"]')!.click(); f.detectChanges(); expect(root.querySelector('[role=dialog]')?.textContent).toContain('Observed evidence');
    root.querySelector<HTMLButtonElement>('[aria-label="Close revision"]')!.click(); f.detectChanges(); expect(root.querySelector('[role=dialog]')).toBeNull();
  });
  it('confirms discard and recovers loading errors without fake feedback', async () => {
    const pending = new Subject(); repo.get.mockReturnValueOnce(pending);
    const f = TestBed.createComponent(ScorecardComponent); f.detectChanges(); expect(f.nativeElement.textContent).toContain('Loading scorecard');
    pending.error(new Error('Unavailable')); await vi.waitFor(() => { f.detectChanges(); expect(f.nativeElement.textContent).toContain('Unavailable'); });
    f.nativeElement.querySelector('[role=alert] button').click(); await f.whenStable(); f.detectChanges();
    await vi.waitFor(() => { f.detectChanges(); expect(f.nativeElement.querySelector('textarea')).not.toBeNull(); });
    const root = f.nativeElement as HTMLElement, textarea = root.querySelector<HTMLTextAreaElement>('textarea[name=strengths]')!;
    textarea.value = 'Unsaved'; textarea.dispatchEvent(new Event('input')); f.detectChanges(); await f.whenStable();
    const button = (text: string) => [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === text)!;
    button('Reload saved version').click(); f.detectChanges(); expect(root.textContent).toContain('Discard unsaved changes?');
    button('Discard & reload').click(); await vi.waitFor(() => { f.detectChanges(); expect(root.querySelector<HTMLTextAreaElement>('textarea[name=strengths]')?.value).toBe('Observed evidence'); });
  });
});
