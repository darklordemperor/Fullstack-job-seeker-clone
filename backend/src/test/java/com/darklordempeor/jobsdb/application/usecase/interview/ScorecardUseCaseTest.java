package com.darklordempeor.jobsdb.application.usecase.interview;

import com.darklordempeor.jobsdb.application.port.*;
import com.darklordempeor.jobsdb.application.model.ScorecardCommand;
import com.darklordempeor.jobsdb.domain.model.*;
import com.darklordempeor.jobsdb.domain.exception.*;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ScorecardUseCaseTest {
    final InterviewPort interviews=mock(InterviewPort.class);
    final ScorecardPort cards=mock(ScorecardPort.class);
    final ScorecardUseCase useCase=new ScorecardUseCase(interviews,cards);
    final UUID owner=UUID.randomUUID(), id=UUID.randomUUID(), application=UUID.randomUUID();
    final Scorecard.Feedback feedback=new Scorecard.Feedback(4,3,5," Evidence ","",Scorecard.Recommendation.HIRE);
    Interview interview(Interview.Status status) { return new Interview(id,application,owner,UUID.randomUUID(),status,Interview.Mode.IN_PERSON,"Room","UTC",List.of(),null,2,Instant.now(),Instant.now()); }
    @Test void savesDraftAndFinalUnderSharedLockAndKeepsIndependentVersions() {
        when(interviews.find(id)).thenReturn(interview(Interview.Status.COMPLETED));
        var draft=useCase.save(owner,id,new ScorecardCommand(0,feedback),false);
        assertThat(draft.version()).isEqualTo(1); assertThat(draft.status()).isEqualTo(Scorecard.Status.DRAFT); assertThat(draft.finalizedAt()).isNull();
        var order=inOrder(interviews,cards); order.verify(interviews).find(id); order.verify(interviews).lockApplication(application); order.verify(interviews).find(id); order.verify(cards).find(id); order.verify(cards).save(draft);
        when(cards.find(id)).thenReturn(draft);
        var finalized=useCase.save(owner,id,new ScorecardCommand(1,feedback),true);
        assertThat(finalized.version()).isEqualTo(2); assertThat(finalized.finalizedAt()).isEqualTo(finalized.updatedAt()); assertThat(finalized.feedback().strengths()).isEqualTo("Evidence");
    }
    @Test void ownershipAndRereadProtectEveryEntryPoint() {
        when(interviews.find(id)).thenReturn(interview(Interview.Status.PROPOSED));
        assertThat(useCase.get(owner,id)).isNull();
        useCase.history(owner,id,-2,100); verify(cards).history(id,0,50);
        useCase.history(owner,id,2,0); verify(cards).history(id,2,1);
        var stranger=UUID.randomUUID();
        assertThatThrownBy(()->useCase.get(stranger,id)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(()->useCase.history(stranger,id,0,8)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(()->useCase.save(stranger,id,new ScorecardCommand(0,feedback),false)).isInstanceOf(ForbiddenException.class);
        when(interviews.find(id)).thenReturn(interview(Interview.Status.PROPOSED),interview(Interview.Status.CANCELLED));
        assertThatThrownBy(()->useCase.save(owner,id,new ScorecardCommand(0,feedback),false)).isInstanceOf(ConflictException.class);
        verify(cards,never()).save(any());
    }
}
