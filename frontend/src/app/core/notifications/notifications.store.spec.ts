import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { NotificationsStore } from './notifications.store';
import { NOTIFICATION_REPOSITORY } from '../di/repository.tokens';
import { AuthStore } from '../auth/auth.store';
import { InboxNotification } from '../../domain/notification.model';
import { PagedResponse } from '../../domain/page.model';

describe('Notification inbox state', () => {
  const item={id:'id',readAt:null} as InboxNotification;
  const result: PagedResponse<InboxNotification>={content:[item],totalElements:1,totalPages:1,page:0};
  const repo={list:vi.fn(),unreadCount:vi.fn(),markRead:vi.fn()};
  beforeEach(() => {
    vi.resetAllMocks(); repo.list.mockReturnValue(of(result)); repo.unreadCount.mockReturnValue(of({unreadCount:1})); repo.markRead.mockReturnValue(of({...item,readAt:'now'}));
    TestBed.configureTestingModule({providers:[{provide:NOTIFICATION_REPOSITORY,useValue:repo},{provide:AuthStore,useValue:{user:signal({id:'user-a'})}}]});
  });
  it('loads, filters, reads and recovers an emptied last page',async () => {
    const store=TestBed.inject(NotificationsStore); await store.load(); expect(store.items()).toEqual([item]); expect(store.unreadCount()).toBe(1);
    repo.list.mockReturnValueOnce(of({content:[],page:2,totalPages:2,totalElements:21})); await store.load(2,true); expect(repo.list).toHaveBeenLastCalledWith(1,true);
    await store.markRead(item); expect(repo.markRead).toHaveBeenCalledWith('id'); expect(store.busyId()).toBe('');
    await store.markRead({...item,readAt:'now'}); expect(repo.markRead).toHaveBeenCalledTimes(1);
  });
  it('keeps failed queries and failed writes visible and supports retry',async () => {
    const store=TestBed.inject(NotificationsStore); repo.list.mockReturnValue(throwError(()=>new Error('Offline'))); await store.load(); expect(store.error()).toBe('Offline'); expect(store.items()).toEqual([]);
    repo.list.mockReturnValue(of(result)); await store.load(); expect(store.error()).toBe('');
    repo.markRead.mockReturnValue(throwError(()=>new Error('Write failed'))); await store.markRead(item); expect(store.actionError()).toBe('Write failed'); expect(store.items()[0].readAt).toBeNull();
    repo.unreadCount.mockReturnValue(throwError(()=>new Error('Count failed'))); await store.refreshCount(); expect(store.unreadCount()).toBeNull(); expect(store.countError()).toBe(true);
    repo.unreadCount.mockReturnValue(of({unreadCount:0})); await store.refreshCount(); expect(store.unreadCount()).toBe(0); expect(store.countError()).toBe(false);
    repo.list.mockReturnValue(throwError(()=>({}))); await store.load(); expect(store.error()).toContain('Unable to load');
  });
  it('ignores out-of-order responses and never leaks a previous session inbox',async () => {
    const store=TestBed.inject(NotificationsStore), stale=new Subject<PagedResponse<InboxNotification>>();
    repo.list.mockReturnValueOnce(stale); const first=store.load(); await store.load(0,true); stale.next({...result,content:[{...item,id:'stale'}]}); stale.complete(); await first; expect(store.items()[0].id).toBe('id');
    const count=new Subject<{unreadCount:number}>(); repo.unreadCount.mockReturnValueOnce(count); const oldCount=store.refreshCount(); await store.refreshCount(); count.next({unreadCount:900}); count.complete(); await oldCount; expect(store.unreadCount()).toBe(1);
    const old=new Subject<PagedResponse<InboxNotification>>(); repo.list.mockReturnValueOnce(old); const loading=store.load(); store.connect('user-b'); old.next(result); old.complete(); await loading; expect(store.items()).toEqual([]);
    const failed=new Subject<PagedResponse<InboxNotification>>(); repo.list.mockReturnValueOnce(failed); const late=store.load(); store.connect(null); failed.error(new Error('Old user')); await late; expect(store.error()).toBe(''); expect(store.unreadCount()).toBeNull();
    await store.load(); await store.refreshCount(); await store.markRead(item); expect(store.items()).toEqual([]);
  });
  it('prevents overlapping writes and discards results after logout',async () => {
    const store=TestBed.inject(NotificationsStore), pending=new Subject<InboxNotification>(); repo.markRead.mockReturnValueOnce(pending);
    const saving=store.markRead(item); await store.markRead(item); expect(repo.markRead).toHaveBeenCalledTimes(1);
    store.connect(null); pending.next({...item,readAt:'now'}); pending.complete(); await saving; expect(store.items()).toEqual([]); expect(store.busyId()).toBe('');
    store.connect('user-b'); const failure=new Subject<InboxNotification>(); repo.markRead.mockReturnValueOnce(failure); const changing=store.markRead(item); store.connect(null); failure.error(new Error('Old write')); await changing; expect(store.actionError()).toBe('');
  });
});
