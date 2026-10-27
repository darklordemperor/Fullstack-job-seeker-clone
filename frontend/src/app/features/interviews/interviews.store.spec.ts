import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { InterviewsStore } from './interviews.store';
import { INTERVIEW_REPOSITORY, EMPLOYER_REPOSITORY } from '../../core/di/repository.tokens';
import { SCHEDULE_INTERVIEW } from '../../core/di/use-case.tokens';
import { Interview, InterviewProposal } from '../../domain/interview.model';
import { PagedResponse } from '../../domain/page.model';

describe('InterviewsStore', () => {
  const repo={list:vi.fn(),detail:vi.fn(),decide:vi.fn(),calendar:vi.fn(),history:vi.fn()}, scheduler={execute:vi.fn()}, employer={applicant:vi.fn()};
  const item={id:'id',version:2} as Interview;
  const result: PagedResponse<Interview>={content:[item],page:0,totalPages:1,totalElements:1};
  beforeEach(() => {
    vi.resetAllMocks(); repo.list.mockReturnValue(of(result));
    TestBed.configureTestingModule({providers:[InterviewsStore,{provide:INTERVIEW_REPOSITORY,useValue:repo},{provide:EMPLOYER_REPOSITORY,useValue:employer},{provide:SCHEDULE_INTERVIEW,useValue:scheduler}]});
  });
  it('opens exact inbox targets including closed interviews and discards stale detail responses',async () => {
    const store=TestBed.inject(InterviewsStore); repo.detail.mockReturnValue(of(item)); await store.open('job-seeker','id');
    expect(store.items()).toEqual([item]); expect(store.focusedId()).toBe('id'); expect(store.upcoming()).toBe(false);
    repo.detail.mockReturnValue(throwError(()=>new Error('Unavailable'))); await store.open('job-seeker','missing'); expect(store.error()).toBe('Unavailable');
    const late=new Subject<Interview>(); repo.detail.mockReturnValueOnce(late); const pending=store.open('job-seeker','old'); await store.load('job-seeker'); late.next({...item,id:'old'}); late.complete(); await pending; expect(store.focusedId()).toBe(''); expect(store.items()).toEqual([item]);
  });
  it('ignores closed or replaced history requests and supports retry and pagination', async () => {
    const store=TestBed.inject(InterviewsStore), pending=new Subject<unknown>(); repo.history.mockReturnValueOnce(pending);
    const first=store.history('employer',item); store.closeHistory(); pending.next({content:[{version:0}],page:0,totalPages:1}); pending.complete(); await first;
    expect(store.historyItem()).toBeNull(); expect(store.revisions()).toEqual([]);
    repo.history.mockReturnValue(throwError(()=>new Error('Offline'))); await store.history('employer',item); expect(store.historyError()).toBe('Offline');
    repo.history.mockReturnValue(of({content:[{version:4}],page:1,totalPages:2,totalElements:11})); await store.history('employer',item,1);
    expect(store.historyError()).toBe(''); expect(store.historyPage()).toBe(1); expect(store.revisions()[0].version).toBe(4);
    const late=new Subject<unknown>(); repo.history.mockReturnValueOnce(late); const closing=store.history('employer',item); store.dispose();
    late.next({content:[{version:9}],page:0,totalPages:1}); late.complete(); await closing; expect(store.revisions()).toEqual([]);
  });
  it('ignores stale loads and allows error retry without pretending empty success', async () => {
    const pending=new Subject<PagedResponse<Interview>>(); repo.list.mockReturnValueOnce(pending);
    const store=TestBed.inject(InterviewsStore); const first=store.load('employer'); await store.load('employer',0,false);
    pending.next({...result,content:[]}); pending.complete(); await first; expect(store.items()).toEqual([item]);
    repo.list.mockReturnValue(throwError(()=>new Error('Offline'))); await store.load('employer'); expect(store.error()).toBe('Offline'); expect(store.loading()).toBe(false);
    repo.list.mockReturnValue(of(result)); await store.load('employer'); expect(store.error()).toBe('');
  });
  it('preserves failures, blocks duplicate writes and reloads successful decisions', async () => {
    const pending=new Subject<Interview>(); repo.decide.mockReturnValue(pending);
    const store=TestBed.inject(InterviewsStore); const first=store.decide('job-seeker',item,'accept','slot'); await store.decide('job-seeker',item,'accept','slot');
    expect(repo.decide).toHaveBeenCalledOnce(); expect(store.busy()).toBe(true);
    pending.error(new Error('Conflict')); await first; expect(store.actionError()).toContain('Conflict'); expect(store.busy()).toBe(false);
    repo.decide.mockReturnValue(of(item)); await store.decide('job-seeker',item,'decline'); expect(store.actionError()).toBe(''); expect(repo.list).toHaveBeenCalled();
  });
  it('keeps an unsuccessful schedule recoverable and exposes applicant and calendar failures', async () => {
    const store=TestBed.inject(InterviewsStore); employer.applicant.mockReturnValue(of({application:{applicantName:'Candidate',jobTitle:'Engineer'}}));
    expect(await store.loadApplicant('app')).toBe(true); expect(store.applicant()?.name).toBe('Candidate');
    scheduler.execute.mockReturnValue(throwError(()=>new Error('Bad time')));
    expect(await store.schedule('app',{} as InterviewProposal)).toBe(false); expect(store.actionError()).toBe('Bad time');
    scheduler.execute.mockReturnValue(of(item)); expect(await store.schedule('app',{} as InterviewProposal)).toBe(true);
    repo.calendar.mockReturnValue(throwError(()=>new Error('Unavailable'))); expect(await store.calendar('employer','id')).toBeNull();
    employer.applicant.mockReturnValue(throwError(()=>new Error('Forbidden'))); expect(await store.loadApplicant('other')).toBe(false); expect(store.applicant()).toBeNull();
  });
});
