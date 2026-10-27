package com.darklordempeor.jobsdb.domain.model;

import java.time.Instant;
import java.util.UUID;

/** Public inbox item: no recipient, actor, event key or internal hiring note. */
public record Notification(UUID id, Kind kind, String title, String message, String href, Instant createdAt, Instant readAt) {
    public enum Kind { JOB_MATCH, NEW_APPLICATION, APPLICATION_STATUS, INTERVIEW_PROPOSED, INTERVIEW_RESCHEDULED,
        INTERVIEW_CONFIRMED, INTERVIEW_DECLINED, INTERVIEW_CANCELLED, INTERVIEW_COMPLETED, INTERVIEW_NO_SHOW }
}
