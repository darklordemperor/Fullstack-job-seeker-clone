package com.darklordempeor.jobsdb.application.port;

import com.darklordempeor.jobsdb.application.model.NotificationModels.Draft;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.domain.model.Notification;
import java.util.UUID;

public interface NotificationPort {
    void publish(Draft notification);
    Page<Notification> list(UUID recipient, boolean unreadOnly, int page, int size);
    long unreadCount(UUID recipient);
    Notification markRead(UUID recipient, UUID id);
}
