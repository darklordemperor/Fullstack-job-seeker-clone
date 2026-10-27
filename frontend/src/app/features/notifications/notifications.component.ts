import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationsStore } from '../../core/notifications/notifications.store';
import { PaginationComponent } from '../../shared/ui/pagination/pagination.component';
import { notificationTarget } from '../../domain/notification-target';

@Component({
  selector: 'app-notifications', standalone: true, imports: [DatePipe, RouterLink, PaginationComponent],
  template: `<main class="shell max-w-4xl py-8 sm:py-12">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div><p class="text-sm font-semibold text-blue-700">Your workspace</p><h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-950">Notifications</h1>
      <p class="mt-3 max-w-xl text-sm leading-6 text-slate-600">Stay up to date with job matches, applications and interviews. Open an update to see the latest details.</p></div>
      <button type="button" class="min-h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-50" [disabled]="store.loading() || !!store.busyId()" (click)="store.load(store.page())">Refresh</button>
    </div>
    <section class="card-surface mt-7 overflow-hidden" aria-label="Notification inbox">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:px-6">
        <div class="flex gap-2" role="group" aria-label="Notification filters">
          <button class="min-h-11 rounded-lg px-4 text-sm font-semibold" [class.bg-blue-800]="!store.unreadOnly()" [class.text-white]="!store.unreadOnly()" [attr.aria-pressed]="!store.unreadOnly()" [disabled]="!!store.busyId()" (click)="store.load(0,false)">All updates</button>
          <button class="min-h-11 rounded-lg px-4 text-sm font-semibold" [class.bg-blue-800]="store.unreadOnly()" [class.text-white]="store.unreadOnly()" [attr.aria-pressed]="store.unreadOnly()" [disabled]="!!store.busyId()" (click)="store.load(0,true)">Unread</button>
        </div>
        <p class="text-xs font-medium text-slate-600" aria-live="polite">@if (store.unreadCount() !== null) { {{ store.unreadCount() }} unread } @else if (store.countError()) { Unread count unavailable }</p>
      </div>
      @if (store.actionError()) { <p role="alert" class="m-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{{ store.actionError() }}</p> }
      @if (store.loading()) { <p role="status" class="p-12 text-center text-sm text-slate-600">Loading notifications…</p> }
      @else if (store.error()) { <div role="alert" class="p-10 text-center"><p class="text-red-800">{{ store.error() }}</p><button class="mt-4 min-h-11 rounded-lg border px-5 font-semibold text-blue-800" (click)="store.load(store.page())">Try again</button></div> }
      @else {
        <ul class="divide-y divide-slate-100">
          @for (item of store.items(); track item.id) {
            <li class="flex min-w-0 gap-3 p-5 sm:gap-5 sm:p-6" [class.bg-blue-50/40]="!item.readAt">
              <span class="mt-2 h-2 w-2 shrink-0 rounded-full" [class.bg-blue-700]="!item.readAt" [class.bg-slate-200]="!!item.readAt" aria-hidden="true"></span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center justify-between gap-2"><h2 class="break-words font-semibold text-slate-950">{{ item.title }} @if (!item.readAt) { <span class="ml-1 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900">Unread</span> }</h2>
                  <time [attr.datetime]="item.createdAt" class="text-xs text-slate-500">{{ item.createdAt | date:'medium' }}</time></div>
                <p class="mt-2 break-words text-sm leading-6 text-slate-600">{{ item.message }}</p>
                <div class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  @if (target(item.href); as destination) { <a [routerLink]="destination.path" [queryParams]="destination.queryParams" class="inline-flex min-h-11 items-center text-sm font-semibold text-blue-800 underline underline-offset-4">View details <span class="sr-only">: {{ item.title }}</span></a> }
                  @if (!item.readAt) { <button type="button" class="min-h-11 text-sm font-semibold text-slate-600 hover:text-blue-800 disabled:opacity-50" [disabled]="!!store.busyId()" (click)="store.markRead(item)">{{ store.busyId() === item.id ? 'Saving…' : 'Mark as read' }}</button> }
                  @else { <span class="inline-flex min-h-11 items-center text-xs text-slate-500">Read</span> }
                </div>
              </div>
            </li>
          } @empty { <li class="px-6 py-14 text-center"><div class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-xl text-blue-800" aria-hidden="true">✓</div><h2 class="text-lg font-bold">{{ store.unreadOnly() ? 'You’re all caught up' : 'No updates yet' }}</h2><p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{{ store.unreadOnly() ? 'There are no unread notifications. You can still browse all your updates.' : 'New job matches and updates to your applications or interviews will appear here.' }}</p></li> }
        </ul>
      }
    </section>
    @if (!store.loading() && !store.error() && store.totalPages() > 1 && !store.busyId()) { <div class="mt-5"><app-pagination [page]="store.page()" [totalPages]="store.totalPages()" (pageChange)="store.load($event)" /></div> }
    <p class="mt-5 text-center text-xs leading-5 text-slate-500">Opening an update keeps it unread until you choose Mark as read. Refresh to check for new updates.</p>
  </main>`,
})
export class NotificationsComponent implements OnInit {
  protected readonly target=notificationTarget;
  protected readonly store=inject(NotificationsStore);
  ngOnInit(): void { void this.store.load(0,false); }
}
