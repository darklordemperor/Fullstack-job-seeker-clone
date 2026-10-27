import { Observable } from 'rxjs';
import { InboxNotification } from '../notification.model';
import { PagedResponse } from '../page.model';

export interface NotificationRepositoryPort {
  list(page: number, unreadOnly: boolean): Observable<PagedResponse<InboxNotification>>;
  unreadCount(): Observable<{ unreadCount: number }>;
  markRead(id: string): Observable<InboxNotification>;
}
