package com.darklordempeor.jobsdb.domain.service;

import com.darklordempeor.jobsdb.domain.model.Interview;
import com.darklordempeor.jobsdb.domain.exception.*;
import java.net.URI;
import java.time.*;
import java.util.List;

public final class InterviewRules {
    private InterviewRules() {}
    public static void proposal(Interview.Mode mode, String location, String timezone, List<Interview.Slot> slots, Instant now) {
        if (mode == null || location == null || location.isBlank() || location.length() > 1000) throw new DomainException("Interview location or meeting link is required (maximum 1000 characters)");
        if (mode == Interview.Mode.ONLINE) {
            try {
                URI uri = URI.create(location);
                if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) throw new IllegalArgumentException();
            } catch (IllegalArgumentException e) { throw new DomainException("Online interviews require a valid HTTPS meeting link without embedded credentials"); }
        }
        try { ZoneId.of(timezone); } catch (RuntimeException e) { throw new DomainException("A valid timezone is required"); }
        if (slots == null || slots.isEmpty() || slots.size() > 3) throw new DomainException("Offer between one and three interview slots");
        for (var slot : slots) {
            if (slot == null || slot.startsAt() == null || slot.endsAt() == null) throw new DomainException("Each slot requires start and end times");
            Duration duration = Duration.between(slot.startsAt(), slot.endsAt());
            if (!slot.startsAt().isAfter(now) || slot.startsAt().isAfter(now.plus(Duration.ofDays(365))) || duration.compareTo(Duration.ofMinutes(15)) < 0 || duration.compareTo(Duration.ofHours(4)) > 0) throw new DomainException("Slots must start in the next 365 days and last 15 minutes to 4 hours");
        }
        for (int i = 0; i < slots.size(); i++) for (int j = i + 1; j < slots.size(); j++) {
            if (overlap(slots.get(i), slots.get(j))) throw new DomainException("Proposed slots must not overlap");
        }
    }
    public static boolean overlap(Interview.Slot a, Interview.Slot b) {
        return a.startsAt().isBefore(b.endsAt()) && b.startsAt().isBefore(a.endsAt());
    }
    public static void editable(Interview interview, int expectedVersion) {
        if (interview.version() != expectedVersion) throw new ConflictException("Interview changed; reload before updating");
        if (interview.status() != Interview.Status.PROPOSED && interview.status() != Interview.Status.CONFIRMED) throw new ConflictException("This invitation is closed; create a new invitation");
    }
    public static void finishing(Interview interview, Interview.Status outcome, Instant now) {
        if (outcome != Interview.Status.COMPLETED && outcome != Interview.Status.NO_SHOW) throw new DomainException("Choose COMPLETED or NO_SHOW");
        if (interview.status() != Interview.Status.CONFIRMED) throw new ConflictException("Only confirmed interviews can have an outcome");
        var selected = interview.slots().stream().filter(s -> s.id().equals(interview.selectedSlotId())).findFirst().orElseThrow(() -> new ConflictException("Confirmed slot is missing"));
        if (selected.endsAt().isAfter(now)) throw new ConflictException("Record an outcome after the scheduled interview ends");
    }
    public static Interview.Slot accepting(Interview interview, java.util.UUID slotId, Instant now) {
        if (interview.status() != Interview.Status.PROPOSED) throw new ConflictException("Only a proposed invitation can be accepted");
        var slot = interview.slots().stream().filter(s -> s.id().equals(slotId)).findFirst().orElseThrow(() -> new DomainException("Choose a slot from this invitation"));
        if (!slot.startsAt().isAfter(now)) throw new ConflictException("This slot has expired; ask the employer for new times");
        return slot;
    }
}
