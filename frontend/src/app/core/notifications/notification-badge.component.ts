import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationsStore } from './notifications.store';

@Component({
  selector: 'app-notification-badge', standalone: true, imports: [RouterLink],
  template: `<a routerLink="/notifications" class="relative flex min-h-11 min-w-11 items-center justify-center rounded-full text-blue-900 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-700"
    [attr.aria-label]="store.countError() ? 'Notifications, unread count unavailable' : 'Notifications' + (store.unreadCount() !== null ? ', ' + store.unreadCount() + ' unread' : '')">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 20h6" /></svg>
    @if (store.unreadCount(); as count) { <span aria-hidden="true" class="absolute right-0 top-0 min-w-4 rounded-full bg-blue-800 px-1 text-center text-[10px] font-bold leading-4 text-white">{{ count > 99 ? '99+' : count }}</span> }
    @if (store.countError()) { <span aria-hidden="true" class="absolute right-0 top-0 text-xs font-bold">?</span> }
  </a>`,
})
export class NotificationBadgeComponent { protected readonly store=inject(NotificationsStore); }
