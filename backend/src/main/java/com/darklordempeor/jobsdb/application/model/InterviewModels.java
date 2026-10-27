package com.darklordempeor.jobsdb.application.model;
import com.darklordempeor.jobsdb.domain.model.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class InterviewModels {
    private InterviewModels() {}
    public record SlotCommand(Instant startsAt, Instant endsAt) {}
    public record Proposal(Interview.Mode mode, String location, String timezone, List<SlotCommand> slots) {}
    public record Context(UUID applicationId, UUID employerId, UUID candidateId, ApplicationStatus status) {}
    public record View(UUID id, UUID applicationId, String jobTitle, String companyName, String candidateName,
                       Interview.Status status, Interview.Mode mode, String location, String timezone,
                       List<Interview.Slot> slots, UUID selectedSlotId, int version, Instant updatedAt, int round) {}
    public record Snapshot(Interview.Status status, Interview.Mode mode, String location, String timezone, List<Interview.Slot> slots, UUID selectedSlotId) {}
    public record Revision(int version, String event, Instant occurredAt, Snapshot snapshot) {}
}
