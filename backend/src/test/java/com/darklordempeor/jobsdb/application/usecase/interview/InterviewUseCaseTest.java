package com.darklordempeor.jobsdb.application.usecase.interview;
import com.darklordempeor.jobsdb.application.model.InterviewModels.*;
import com.darklordempeor.jobsdb.application.port.InterviewPort;
import com.darklordempeor.jobsdb.domain.model.*;
import com.darklordempeor.jobsdb.domain.exception.*;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class InterviewUseCaseTest {
    final InterviewPort port=mock(InterviewPort.class);
    final InterviewUseCase useCase=new InterviewUseCase(port,mock(com.darklordempeor.jobsdb.application.usecase.notification.NotificationPublisher.class));
    final UUID employer=UUID.randomUUID(), candidate=UUID.randomUUID(), application=UUID.randomUUID(), id=UUID.randomUUID();
    final Instant now=Instant.now();
    final Interview.Slot slot=new Interview.Slot(UUID.randomUUID(),now.plusSeconds(86400),now.plusSeconds(90000));
    final Context context=new Context(application,employer,candidate,ApplicationStatus.REVIEWING);
    Interview current(Interview.Status status) { return new Interview(id,application,employer,candidate,status,Interview.Mode.ONLINE,"https://example.com","UTC",List.of(slot),status==Interview.Status.CONFIRMED?slot.id():null,2,now,now); }
    Proposal proposal() { return new Proposal(Interview.Mode.IN_PERSON," Room 1 ","UTC",List.of(new SlotCommand(slot.startsAt(),slot.endsAt()))); }
    void setup(Interview.Status status) { when(port.find(id)).thenReturn(current(status)); when(port.lockApplication(application)).thenReturn(context); }
    @Test void completedOutcomesKeepSelectedSlotAndHistoryIsOwnerScopedAndBounded() {
        setup(Interview.Status.CONFIRMED);
        var past = new Interview.Slot(slot.id(),now.minusSeconds(7200),now.minusSeconds(3600));
        var value = new Interview(id,application,employer,candidate,Interview.Status.CONFIRMED,Interview.Mode.IN_PERSON,"Room","UTC",List.of(past),past.id(),2,now,now);
        when(port.find(id)).thenReturn(value);
        useCase.finish(employer,id,2,Interview.Status.COMPLETED);
        verify(port).save(argThat(i -> i.status()==Interview.Status.COMPLETED && i.selectedSlotId().equals(past.id()) && i.version()==3),eq(false));
        assertThatThrownBy(() -> useCase.finish(candidate,id,2,Interview.Status.NO_SHOW)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> useCase.finish(employer,id,1,Interview.Status.NO_SHOW)).isInstanceOf(ConflictException.class);
        useCase.history(employer,true,id,-1,100); verify(port).history(id,0,50);
        useCase.history(candidate,false,id,2,0); verify(port).history(id,2,1);
        assertThatThrownBy(() -> useCase.history(UUID.randomUUID(),false,id,0,10)).isInstanceOf(ForbiddenException.class);
    }
    @Test void creationAndReschedulingPreserveOwnershipAndResetConfirmation() {
        setup(Interview.Status.CONFIRMED);
        useCase.propose(employer,application,proposal());
        verify(port).save(argThat(i -> i.status()==Interview.Status.PROPOSED && i.version()==0 && i.selectedSlotId()==null && i.location().equals("Room 1")),eq(true));
        useCase.reschedule(employer,id,2,proposal());
        verify(port).save(argThat(i -> i.id().equals(id) && i.version()==3 && i.selectedSlotId()==null && i.status()==Interview.Status.PROPOSED),eq(false));
    }
    @Test void duplicateAndUnauthorizedAndTerminalApplicationsCannotSchedule() {
        setup(Interview.Status.PROPOSED);
        assertThatThrownBy(() -> useCase.propose(candidate,application,proposal())).isInstanceOf(ForbiddenException.class);
        when(port.hasActive(application)).thenReturn(true);
        assertThatThrownBy(() -> useCase.propose(employer,application,proposal())).isInstanceOf(ConflictException.class);
        for (var status : List.of(ApplicationStatus.HIRED,ApplicationStatus.REJECTED)) {
            when(port.lockApplication(application)).thenReturn(new Context(application,employer,candidate,status));
            assertThatThrownBy(() -> useCase.propose(employer,application,proposal())).isInstanceOf(ConflictException.class);
        }
        when(port.lockApplication(application)).thenReturn(new Context(application,employer,candidate,ApplicationStatus.SUBMITTED));
        when(port.hasActive(application)).thenReturn(false); useCase.propose(employer,application,proposal());
    }
    @Test void acceptanceSerializesBookingChecksAndRejectsOverlap() {
        setup(Interview.Status.PROPOSED); useCase.accept(candidate,id,2,slot.id());
        var ordered=inOrder(port); ordered.verify(port).lockParticipants(employer,candidate); ordered.verify(port).overlaps(employer,candidate,id,slot);
        verify(port).save(argThat(i -> i.status()==Interview.Status.CONFIRMED && i.selectedSlotId().equals(slot.id()) && i.version()==3),eq(false));
        when(port.overlaps(employer,candidate,id,slot)).thenReturn(true);
        assertThatThrownBy(() -> useCase.accept(candidate,id,2,slot.id())).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> useCase.accept(employer,id,2,slot.id())).isInstanceOf(ForbiddenException.class);
    }
    @Test void declineCancelDetailAndPagingEnforceIdentityAndVersion() {
        setup(Interview.Status.PROPOSED); useCase.decline(candidate,id,2);
        verify(port).save(argThat(i -> i.status()==Interview.Status.DECLINED),eq(false));
        useCase.cancel(candidate,false,id,2); useCase.cancel(employer,true,id,2);
        verify(port,times(2)).save(argThat(i -> i.status()==Interview.Status.CANCELLED),eq(false));
        useCase.detail(candidate,false,id); useCase.detail(employer,true,id);
        assertThatThrownBy(() -> useCase.detail(UUID.randomUUID(),true,id)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> useCase.cancel(employer,true,id,1)).isInstanceOf(ConflictException.class);
        when(port.find(id)).thenReturn(current(Interview.Status.CONFIRMED));
        assertThatThrownBy(() -> useCase.decline(candidate,id,2)).isInstanceOf(ConflictException.class);
        useCase.list(candidate,false,true,-1,100); verify(port).list(candidate,false,true,0,50);
        useCase.list(employer,true,false,2,0); verify(port).list(employer,true,false,2,1);
        when(port.find(id)).thenThrow(new ResourceNotFoundException("Missing"));
        assertThatThrownBy(() -> useCase.detail(candidate,false,id)).isInstanceOf(ResourceNotFoundException.class);
    }
}
