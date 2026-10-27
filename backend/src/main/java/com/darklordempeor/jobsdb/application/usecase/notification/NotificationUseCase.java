package com.darklordempeor.jobsdb.application.usecase.notification;

import com.darklordempeor.jobsdb.application.port.NotificationPort;
import com.darklordempeor.jobsdb.application.model.NotificationModels.UnreadCount;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.domain.model.Notification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@Transactional
public class NotificationUseCase {
    private final NotificationPort notifications;
    public NotificationUseCase(NotificationPort notifications) { this.notifications = notifications; }
    @Transactional(readOnly=true, isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Page<Notification> list(UUID user, boolean unreadOnly, int page, int size) {
        return notifications.list(user, unreadOnly, Math.max(0,page), Math.max(1,Math.min(50,size)));
    }
    @Transactional(readOnly=true)
    public UnreadCount unreadCount(UUID user) { return new UnreadCount(notifications.unreadCount(user)); }
    public Notification markRead(UUID user, UUID id) { return notifications.markRead(user,id); }
}
