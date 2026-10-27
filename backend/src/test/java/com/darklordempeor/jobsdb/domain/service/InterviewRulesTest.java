package com.darklordempeor.jobsdb.domain.service;
import com.darklordempeor.jobsdb.domain.model.Interview;
import com.darklordempeor.jobsdb.domain.exception.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class InterviewRulesTest {
    final Instant now=Instant.parse("2026-01-01T00:00:00Z");
    Interview.Slot slot(long start, long duration) { return new Interview.Slot(UUID.randomUUID(),now.plusSeconds(start),now.plusSeconds(start+duration)); }
    Interview interview(Interview.Status status, int version, List<Interview.Slot> slots) { return new Interview(UUID.randomUUID(),UUID.randomUUID(),UUID.randomUUID(),UUID.randomUUID(),status,Interview.Mode.ONLINE,"https://example.com/meet","Asia/Bangkok",slots,null,version,now,now); }
    @Test void validProposalsAcceptAdjacentSlotsOptionalInPersonTextAndDurationBoundaries() {
        InterviewRules.proposal(Interview.Mode.IN_PERSON,"Room 1","UTC",List.of(slot(60,900),slot(960,14400)),now);
        InterviewRules.proposal(Interview.Mode.ONLINE,"https://example.com/meet","Asia/Bangkok",List.of(slot(60,3600)),now);
        assertThat(InterviewRules.overlap(slot(10,30),slot(40,30))).isFalse();
        assertThat(InterviewRules.overlap(slot(40,30),slot(10,30))).isFalse();
        assertThat(InterviewRules.overlap(slot(10,30),slot(20,30))).isTrue();
    }
    @Test void invalidProposalFieldsAreRejected() {
        for (String location : Arrays.asList(null," ","x".repeat(1001))) assertThatThrownBy(() -> InterviewRules.proposal(Interview.Mode.IN_PERSON,location,"UTC",List.of(slot(60,900)),now)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> InterviewRules.proposal(null,"Room","UTC",List.of(slot(60,900)),now)).isInstanceOf(DomainException.class);
        for (String url : List.of("http://example.com","https:/missing-host","https://user:pass@example.com","not a url")) assertThatThrownBy(() -> InterviewRules.proposal(Interview.Mode.ONLINE,url,"UTC",List.of(slot(60,900)),now)).isInstanceOf(DomainException.class);
        for (String zone : Arrays.asList(null,"Bad/Zone")) assertThatThrownBy(() -> InterviewRules.proposal(Interview.Mode.IN_PERSON,"Room",zone,List.of(slot(60,900)),now)).isInstanceOf(DomainException.class);
    }
    @Test void slotValidationRejectsMissingOverlappingPastAndOutOfBoundsTimes() {
        List<List<Interview.Slot>> invalid = new ArrayList<>();
        invalid.add(null); invalid.add(List.of()); invalid.add(Collections.nCopies(4,slot(60,900))); invalid.add(Collections.singletonList(null));
        invalid.add(List.of(new Interview.Slot(UUID.randomUUID(),null,now))); invalid.add(List.of(new Interview.Slot(UUID.randomUUID(),now,null)));
        invalid.add(List.of(slot(0,900))); invalid.add(List.of(slot(366*86400L,900))); invalid.add(List.of(slot(60,899))); invalid.add(List.of(slot(60,14401)));
        invalid.add(List.of(new Interview.Slot(UUID.randomUUID(),now.plusSeconds(60),now.plusSeconds(14460).plusNanos(1))));
        invalid.add(List.of(slot(60,900),slot(900,900)));
        for (var slots : invalid) assertThatThrownBy(() -> InterviewRules.proposal(Interview.Mode.IN_PERSON,"Room","UTC",slots,now)).isInstanceOf(DomainException.class);
    }
    @Test void outcomesRequireConfirmedEndedSlotsAndSupportedStatus() {
        var selected = slot(-3600,3600);
        var value = new Interview(UUID.randomUUID(),UUID.randomUUID(),UUID.randomUUID(),UUID.randomUUID(),Interview.Status.CONFIRMED,Interview.Mode.IN_PERSON,"Room","UTC",List.of(selected),selected.id(),1,now,now);
        InterviewRules.finishing(value,Interview.Status.COMPLETED,now);
        InterviewRules.finishing(value,Interview.Status.NO_SHOW,now);
        assertThatThrownBy(() -> InterviewRules.finishing(value,Interview.Status.CANCELLED,now)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> InterviewRules.finishing(value,null,now)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> InterviewRules.finishing(value,Interview.Status.COMPLETED,now.minusNanos(1))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> InterviewRules.finishing(interview(Interview.Status.PROPOSED,1,List.of(selected)),Interview.Status.COMPLETED,now)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> InterviewRules.finishing(interview(Interview.Status.CONFIRMED,1,List.of(selected)),Interview.Status.COMPLETED,now)).isInstanceOf(ConflictException.class);
    }
    @Test void staleClosedExpiredAndForeignSlotDecisionsAreRejected() {
        var slot = slot(60,900); var current = interview(Interview.Status.PROPOSED,2,List.of(slot));
        InterviewRules.editable(current,2); assertThat(InterviewRules.accepting(current,slot.id(),now)).isEqualTo(slot);
        assertThatThrownBy(() -> InterviewRules.editable(current,1)).isInstanceOf(ConflictException.class);
        for (var status : List.of(Interview.Status.CANCELLED,Interview.Status.DECLINED,Interview.Status.COMPLETED,Interview.Status.NO_SHOW)) assertThatThrownBy(() -> InterviewRules.editable(interview(status,2,List.of(slot)),2)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> InterviewRules.accepting(interview(Interview.Status.CONFIRMED,0,List.of(slot)),slot.id(),now)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> InterviewRules.accepting(current,UUID.randomUUID(),now)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> InterviewRules.accepting(current,null,now)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> InterviewRules.accepting(current,slot.id(),now.plusSeconds(60))).isInstanceOf(ConflictException.class);
    }
}
