import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { InterviewRepository } from './interview.repository';

describe('Interview API contract', () => {
  let http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ providers:[provideHttpClient(),provideHttpClientTesting()] }); http=TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('sends role, pagination, exact proposal fields and version without leaking UI state', () => {
    const repo=TestBed.inject(InterviewRepository);
    repo.detail('job-seeker','id').subscribe(); const detail=http.expectOne('/api/job-seeker/interviews/id'); expect(detail.request.method).toBe('GET'); detail.flush({data:{id:'id'}});
    repo.list('job-seeker',false,2).subscribe();
    const list=http.expectOne(r=>r.url==='/api/job-seeker/interviews'); expect(list.request.params.get('page')).toBe('2'); expect(list.request.params.get('upcoming')).toBe('false'); list.flush({data:{content:[]}});
    const proposal={mode:'ONLINE' as const,location:'https://example.com',timezone:'UTC',slots:[{startsAt:'start',endsAt:'end',internal:'hidden'}],unexpected:true};
    repo.propose('app',proposal).subscribe(); const create=http.expectOne('/api/employer/applications/app/interviews');
    expect(create.request.body).not.toHaveProperty('unexpected'); expect(create.request.body.slots[0]).not.toHaveProperty('internal'); create.flush({data:{}});
    repo.reschedule('id',3,proposal).subscribe(); const edit=http.expectOne('/api/employer/interviews/id?expectedVersion=3'); expect(edit.request.method).toBe('PUT'); edit.flush({data:{}});
    repo.decide('job-seeker','id','accept',3,'slot').subscribe(); const accept=http.expectOne('/api/job-seeker/interviews/id/accept'); expect(accept.request.body).toEqual({expectedVersion:3,slotId:'slot'}); accept.flush({data:{}});
    repo.decide('employer','id','cancel',4).subscribe(); const cancel=http.expectOne('/api/employer/interviews/id/cancel'); expect(cancel.request.body).toEqual({expectedVersion:4}); cancel.flush({data:{}});
  });
  it('maps outcome actions and requests bounded revision history', () => {
    const repo=TestBed.inject(InterviewRepository);
    for (const [action,outcome] of [['complete','COMPLETED'],['no-show','NO_SHOW']] as const) {
      repo.decide('employer','id',action,4).subscribe(); const request=http.expectOne('/api/employer/interviews/id/outcome');
      expect(request.request.body).toEqual({expectedVersion:4,outcome}); request.flush({data:{}});
    }
    repo.history('job-seeker','id',2).subscribe(); const history=http.expectOne('/api/job-seeker/interviews/id/history?page=2&size=10');
    expect(history.request.method).toBe('GET'); history.flush({data:{content:[],page:2,totalPages:3,totalElements:21}});
  });
  it('returns calendar contents and propagates conflict and network errors', () => {
    const repo=TestBed.inject(InterviewRepository), next=vi.fn(), error=vi.fn();
    repo.calendar('employer','id').subscribe(next); http.expectOne('/api/employer/interviews/id/calendar').flush({data:{filename:'interview.ics',content:'BEGIN:VCALENDAR'}});
    expect(next).toHaveBeenCalledWith({filename:'interview.ics',content:'BEGIN:VCALENDAR'});
    repo.decide('job-seeker','id','decline',0).subscribe({error}); http.expectOne('/api/job-seeker/interviews/id/decline').flush({message:'Interview changed'}, {status:409,statusText:'Conflict'});
    expect(error.mock.calls[0][0].message).toBe('Interview changed');
    repo.calendar('employer','id').subscribe({error}); http.expectOne('/api/employer/interviews/id/calendar').error(new ProgressEvent('error'));
    expect(error.mock.calls[1][0].message).toContain('Unable to reach');
  });
});
