package com.darklordempeor.jobsdb.application.model;

import com.darklordempeor.jobsdb.domain.model.Notification.Kind;
import java.util.UUID;

public final class NotificationModels {
    private NotificationModels() {}
    public record Draft(UUID recipientId, String eventKey, Kind kind, String title, String message, String href) {}
    public record UnreadCount(long unreadCount) {}
}
