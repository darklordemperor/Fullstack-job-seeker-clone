import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './dto/api-response';
import { InboxNotification } from '../domain/notification.model';
import { PagedResponse } from '../domain/page.model';
import { NotificationRepositoryPort } from '../domain/repositories/notification.repository.port';

@Injectable({ providedIn: 'root' })
export class NotificationRepository implements NotificationRepositoryPort {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/notifications`;
  private unwrap<T>(request: Observable<ApiResponse<T>>): Observable<T> {
    return request.pipe(map(response => response.data), catchError((error: HttpErrorResponse) =>
      throwError(() => new Error(error.status === 404 ? 'This notification is no longer available.' : 'Unable to load notifications. Please try again.'))));
  }
  list(page: number, unreadOnly: boolean): Observable<PagedResponse<InboxNotification>> {
    return this.unwrap(this.http.get<ApiResponse<PagedResponse<InboxNotification>>>(this.url, { params: { page, unreadOnly, size: 20 } }));
  }
  unreadCount(): Observable<{ unreadCount: number }> {
    return this.unwrap(this.http.get<ApiResponse<{ unreadCount: number }>>(`${this.url}/unread-count`));
  }
  markRead(id: string): Observable<InboxNotification> {
    return this.unwrap(this.http.patch<ApiResponse<InboxNotification>>(`${this.url}/${encodeURIComponent(id)}/read`, {}));
  }
}
