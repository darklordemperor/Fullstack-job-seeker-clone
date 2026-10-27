import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { NotificationRepository } from './notification.repository';
import { environment } from '../../environments/environment';

describe('Notification HTTP boundary', () => {
  let repo: NotificationRepository, http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]}); repo=TestBed.inject(NotificationRepository); http=TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('maps bounded query parameters, count and read responses without changing the envelope contract', async () => {
    const empty={content:[],totalElements:0,totalPages:1,page:2};
    const pending=firstValueFrom(repo.list(2,true));
    const listing=http.expectOne(r=>r.url===`${environment.apiUrl}/notifications`); expect(listing.request.params.get('page')).toBe('2'); expect(listing.request.params.get('unreadOnly')).toBe('true'); expect(listing.request.params.get('size')).toBe('20'); listing.flush({data:empty}); expect(await pending).toEqual(empty);
    const count=firstValueFrom(repo.unreadCount()); http.expectOne(`${environment.apiUrl}/notifications/unread-count`).flush({data:{unreadCount:3}}); expect(await count).toEqual({unreadCount:3});
    const read=firstValueFrom(repo.markRead('id')); const patch=http.expectOne(`${environment.apiUrl}/notifications/id/read`); expect(patch.request.method).toBe('PATCH'); expect(patch.request.body).toEqual({}); patch.flush({data:{id:'id',readAt:'now'}}); expect(await read).toEqual({id:'id',readAt:'now'});
  });
  it.each([404,500])('propagates HTTP %s instead of returning sample data',async status => {
    const pending=firstValueFrom(repo.markRead('missing')); const rejected=expect(pending).rejects.toThrow(status===404?'no longer available':'Unable to load');
    http.expectOne(`${environment.apiUrl}/notifications/missing/read`).flush({}, {status,statusText:'Failure'}); await rejected;
  });
});
