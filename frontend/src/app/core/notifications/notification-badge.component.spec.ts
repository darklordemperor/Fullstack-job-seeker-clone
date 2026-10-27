import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationsStore } from './notifications.store';
import { NotificationBadgeComponent } from './notification-badge.component';
describe('Notification badge', () => {
  it('announces counts, caps the visible badge and distinguishes unavailable counts', () => {
    const store={unreadCount:signal<number|null>(101),countError:signal(false)};
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:NotificationsStore,useValue:store}]});
    const fixture=TestBed.createComponent(NotificationBadgeComponent); fixture.detectChanges(); const root=fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('99+'); expect(root.querySelector('a')?.getAttribute('aria-label')).toContain('101 unread');
    store.unreadCount.set(2); fixture.detectChanges(); expect(root.textContent).toContain('2');
    store.unreadCount.set(0); fixture.detectChanges(); expect(root.querySelector('span')).toBeNull();
    store.unreadCount.set(null); store.countError.set(true); fixture.detectChanges(); expect(root.querySelector('a')?.getAttribute('aria-label')).toContain('unavailable');
  });
});
