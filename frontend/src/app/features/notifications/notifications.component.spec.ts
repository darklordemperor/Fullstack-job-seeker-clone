import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationsComponent } from './notifications.component';
import { NotificationsStore } from '../../core/notifications/notifications.store';
import { InboxNotification } from '../../domain/notification.model';

describe('Notification center', () => {
  const id='11111111-1111-4111-8111-111111111111';
  const item: InboxNotification={id,kind:'INTERVIEW_PROPOSED',title:'Interview invitation',message:'Review the proposed times.',href:`/job-seeker/interviews?interviewId=${id}`,createdAt:'2026-10-24T00:00:00Z',readAt:null};
  function setup() {
    const store={items:signal([item]),unreadCount:signal<number|null>(1),countError:signal(false),loading:signal(false),busyId:signal(''),error:signal(''),actionError:signal(''),page:signal(0),totalPages:signal(2),total:signal(21),unreadOnly:signal(false),load:vi.fn(),markRead:vi.fn()};
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:NotificationsStore,useValue:store}]});
    const fixture=TestBed.createComponent(NotificationsComponent); fixture.detectChanges(); return {fixture,store,root:fixture.nativeElement as HTMLElement};
  }
  it('shows private inbox actions and preserves query parameters in its link', () => {
    const {fixture,store,root}=setup(); expect(store.load).toHaveBeenCalledWith(0,false);
    expect(root.querySelector('a')?.getAttribute('href')).toBe(item.href);
    Array.from(root.querySelectorAll('button')).find(b=>b.textContent?.trim()==='Mark as read')!.click(); expect(store.markRead).toHaveBeenCalledWith(item);
    Array.from(root.querySelectorAll('button')).find(b=>b.textContent?.trim()==='Unread')!.click(); expect(store.load).toHaveBeenCalledWith(0,true);
    Array.from(root.querySelectorAll('button')).find(b=>b.textContent?.trim()==='2')!.click(); expect(store.load).toHaveBeenCalledWith(1);
    store.items.set([{...item,readAt:'2026-10-24T01:00:00Z'}]); fixture.detectChanges(); expect(Array.from(root.querySelectorAll('button')).some(b=>b.textContent?.trim()==='Mark as read')).toBe(false);
    store.items.set([{...item,href:'https://example.com'}]); fixture.detectChanges(); expect(root.querySelector('a')).toBeNull();
  });
  it('distinguishes loading, failure, empty and action failure states', () => {
    const {fixture,store,root}=setup(); store.loading.set(true); fixture.detectChanges(); expect(root.querySelector('[role=status]')?.textContent).toContain('Loading');
    store.loading.set(false); store.error.set('Offline'); fixture.detectChanges(); expect(root.querySelector('[role=alert]')?.textContent).toContain('Offline');
    Array.from(root.querySelectorAll('button')).find(b=>b.textContent?.trim()==='Try again')!.click(); expect(store.load).toHaveBeenCalledWith(0);
    store.error.set(''); store.items.set([]); fixture.detectChanges(); expect(root.textContent).toContain('No updates yet');
    store.unreadOnly.set(true); fixture.detectChanges(); expect(root.textContent).toContain('You’re all caught up');
    store.actionError.set('Could not mark read'); store.unreadCount.set(null); store.countError.set(true); fixture.detectChanges(); expect(root.textContent).toContain('Could not mark read'); expect(root.textContent).toContain('Unread count unavailable');
  });
});
