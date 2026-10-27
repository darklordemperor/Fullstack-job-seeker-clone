package com.darklordempeor.jobsdb.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Interview(UUID id, UUID applicationId, UUID employerId, UUID candidateId, Status status,
                        Mode mode, String location, String timezone, List<Slot> slots, UUID selectedSlotId,
                        int version, Instant createdAt, Instant updatedAt) {
    public enum Status { PROPOSED, CONFIRMED, DECLINED, CANCELLED, COMPLETED, NO_SHOW }
    public enum Mode { ONLINE, IN_PERSON }
    public record Slot(UUID id, Instant startsAt, Instant endsAt) {}
}
