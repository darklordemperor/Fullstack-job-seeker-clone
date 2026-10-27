import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { InterviewsComponent } from './interviews.component';
import { AuthStore } from '../../core/auth/auth.store';
import { INTERVIEW_REPOSITORY, EMPLOYER_REPOSITORY } from '../../core/di/repository.tokens';
import { SCHEDULE_INTERVIEW } from '../../core/di/use-case.tokens';
import { Interview } from '../../domain/interview.model';

describe('Interview page lifecycle', () => {
  const repo = { list: vi.fn(), decide: vi.fn(), history: vi.fn(), calendar: vi.fn() };
  const scheduler = { execute: vi.fn() }, employer = { applicant: vi.fn() }, auth = { isEmployer: vi.fn() };
  const slot = { id:'slot', startsAt:'2000-01-01T01:00:00Z', endsAt:'2000-01-01T02:00:00Z' };
  const item: Interview = { id:'id', applicationId:'app', jobTitle:'Engineer', companyName:'Team', candidateName:'Candidate', status:'CONFIRMED', mode:'ONLINE', location:'https://example.com', timezone:'UTC', slots:[slot], selectedSlotId:'slot', version:1, updatedAt:slot.endsAt, round:1 };
  const page = (content: Interview[]) => ({ content, page:0, totalPages:1, totalElements:content.length });
  beforeEach(() => {
    vi.resetAllMocks(); auth.isEmployer.mockReturnValue(true); repo.list.mockReturnValue(of(page([item])));
    TestBed.configureTestingModule({ providers:[provideRouter([]), {provide:AuthStore,useValue:auth}, {provide:INTERVIEW_REPOSITORY,useValue:repo}, {provide:EMPLOYER_REPOSITORY,useValue:employer}, {provide:SCHEDULE_INTERVIEW,useValue:scheduler}] });
  });
  const button = (root: HTMLElement, text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.trim()===text)!;
  async function render() { const f=TestBed.createComponent(InterviewsComponent); f.detectChanges(); await f.whenStable(); f.detectChanges(); return f; }
  for (const [label, action] of [['Mark completed','complete'],['Mark no-show','no-show']]) {
    it('confirms '+action+' and retains a server failure for retry', async () => {
      repo.decide.mockReturnValue(throwError(()=>new Error('Interview changed')));
      const f=await render(); button(f.nativeElement,label).click(); f.detectChanges();
      expect(repo.decide).not.toHaveBeenCalled(); button(f.nativeElement,'Confirm').click(); await f.whenStable(); f.detectChanges();
      expect(repo.decide).toHaveBeenCalledWith('employer','id',action,1,undefined);
      expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain('Interview changed');
      repo.decide.mockReturnValue(of({...item,status:'COMPLETED'})); repo.list.mockReturnValue(of(page([{...item,status:'COMPLETED',version:2}])));
      button(f.nativeElement,label).click(); f.detectChanges(); button(f.nativeElement,'Confirm').click(); await f.whenStable(); f.detectChanges();
      expect(f.nativeElement.textContent).toContain('COMPLETED'); expect(button(f.nativeElement,'Schedule next round')).toBeDefined();
    });
  }
  it('hides outcome controls from candidates and until the confirmed slot ends', async () => {
    repo.list.mockReturnValue(of(page([{...item,slots:[{...slot,endsAt:'2099-01-01T00:00:00Z'}]}])));
    let f=await render(); expect(button(f.nativeElement,'Mark completed')).toBeUndefined(); f.destroy();
    auth.isEmployer.mockReturnValue(false); repo.list.mockReturnValue(of(page([item]))); f=await render();
    expect(button(f.nativeElement,'Mark completed')).toBeUndefined(); expect(button(f.nativeElement,'Reschedule')).toBeUndefined();
  });
  it('shows loading, history failure/retry and the original schedule with close focus return', async () => {
    const pending=new Subject<unknown>(); repo.history.mockReturnValue(pending);
    const f=await render(); const trigger=button(f.nativeElement,'View history'); trigger.click(); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Loading history'); pending.error(new Error('Offline')); await f.whenStable(); f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain('Offline');
    repo.history.mockReturnValue(of({content:[{version:0,event:'PROPOSED',occurredAt:slot.startsAt,snapshot:{...item,location:'Original room'}}],page:0,totalPages:1,totalElements:1}));
    button(f.nativeElement,'Retry history').click(); await f.whenStable(); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Original room'); expect(f.nativeElement.textContent).toContain('Version 0');
    f.nativeElement.querySelector('[aria-label="Close history"]').click(); f.detectChanges();
    expect(f.nativeElement.querySelector('[aria-label="Interview history"]')).toBeNull(); expect(document.activeElement).toBe(trigger);
  });
  it('creates a fresh round with empty times and keeps a failed draft', async () => {
    repo.list.mockReturnValue(of(page([{...item,status:'COMPLETED'}]))); scheduler.execute.mockReturnValue(throwError(()=>new Error('Offline')));
    const f=await render(); button(f.nativeElement,'Schedule next round').click(); f.detectChanges(); await f.whenStable();
    const start=f.nativeElement.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    expect(start.value).toBe('');
    const input=(name:string,value:string)=>{ const el=f.nativeElement.querySelectorAll('input[type="datetime-local"]')[name==='start0'?0:1] as HTMLInputElement; el.value=value; el.dispatchEvent(new Event('input',{bubbles:true})); };
    input('start0','2026-12-01T10:00'); input('end0','2026-12-01T11:00'); f.detectChanges();
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); await f.whenStable(); f.detectChanges();
    expect(scheduler.execute).toHaveBeenCalledWith('app',expect.objectContaining({location:'https://example.com'}),undefined);
    expect(start.value).toBe('2026-12-01T10:00'); expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain('Offline');
    button(f.nativeElement,'Add another time').click(); f.detectChanges(); expect(f.nativeElement.querySelectorAll('input[type="datetime-local"]')).toHaveLength(4);
    f.nativeElement.querySelector('[aria-label="Remove option 2"]').click(); f.detectChanges(); expect(f.nativeElement.querySelectorAll('input[type="datetime-local"]')).toHaveLength(2);
    button(f.nativeElement,'Cancel').click(); f.detectChanges(); expect(f.nativeElement.querySelector('[aria-label="Interview invitation"]')).toBeNull();
  });
  it('shows list failure, retries and loads a query-linked applicant editor', async () => {
    TestBed.overrideProvider(ActivatedRoute,{useValue:{snapshot:{queryParamMap:convertToParamMap({applicationId:'app'})}}});
    employer.applicant.mockReturnValue(of({application:{applicantName:'Name',jobTitle:'Role'}})); repo.list.mockReturnValue(throwError(()=>new Error('Offline')));
    const f=await render(); await vi.waitFor(() => { f.detectChanges(); expect(f.nativeElement.querySelector('[aria-label="Interview invitation"]')).not.toBeNull(); });
    f.nativeElement.querySelector('[aria-label="Close invitation"]').click(); f.detectChanges();
    repo.list.mockReturnValue(of(page([]))); button(f.nativeElement,'Retry').click(); await f.whenStable(); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No upcoming interviews');
  });
});
