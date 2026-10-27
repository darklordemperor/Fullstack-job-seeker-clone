package com.darklordempeor.jobsdb.application.usecase.jobseeker;
import com.darklordempeor.jobsdb.application.model.*;
import com.darklordempeor.jobsdb.application.port.SavedSearchPort;
import com.darklordempeor.jobsdb.application.usecase.employer.JobEnrichment;
import com.darklordempeor.jobsdb.domain.exception.DomainException;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class SavedSearchUseCaseTest {
    final SavedSearchPort port=mock(SavedSearchPort.class);
    final SavedSearchUseCase useCase=new SavedSearchUseCase(port,new JobEnrichment(ids->Map.of()));
    final UUID user=UUID.randomUUID(),id=UUID.randomUUID();
    @Test void normalizesCriteriaAndDelegatesScopedOperations() {
        useCase.create(user,new SavedSearchCommand(" Java "," JAVA ",null,100,200,"thb"));
        verify(port).create(user,new SavedSearchCommand("Java","JAVA","",100,200,"THB"));
        useCase.create(user,new SavedSearchCommand("Location",null,"Bangkok",null,null,"USD"));
        verify(port).create(user,new SavedSearchCommand("Location","","Bangkok",null,null,""));
        useCase.create(user,new SavedSearchCommand("Min","","",0,null,"THB"));
        useCase.create(user,new SavedSearchCommand("Max","","",null,0,"THB"));
        useCase.list(user); useCase.setEnabled(user,id,false); useCase.delete(user,id);
        verify(port).list(user); verify(port).setEnabled(user,id,false); verify(port).delete(user,id);
        when(port.matches(user,id,0,8)).thenReturn(new HiringModels.Page<>(List.of(),0,1,0));
        assertThat(useCase.matches(user,id,-1).content()).isEmpty();
    }
    @Test void rejectsInvalidCriteriaBeforePersistence() {
        var invalid=List.of(
            new SavedSearchCommand(null,"Java","",null,null,null),
            new SavedSearchCommand("x".repeat(81),"Java","",null,null,null),
            new SavedSearchCommand("Name","x".repeat(151),"",null,null,null),
            new SavedSearchCommand("Name","Java","x".repeat(101),null,null,null),
            new SavedSearchCommand("Name","Java","",-1,null,"THB"),
            new SavedSearchCommand("Name","Java","",null,-1,"THB"),
            new SavedSearchCommand("Name","Java","",200,100,"THB"),
            new SavedSearchCommand("Name","Java","",1,null,null),
            new SavedSearchCommand("Name","","",null,null,null));
        for (var command:invalid) assertThatThrownBy(()->useCase.create(user,command)).isInstanceOf(DomainException.class);
        verifyNoInteractions(port);
    }
}
