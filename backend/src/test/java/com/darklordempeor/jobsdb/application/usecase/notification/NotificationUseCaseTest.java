package com.darklordempeor.jobsdb.application.usecase.notification;

import com.darklordempeor.jobsdb.application.port.NotificationPort;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class NotificationUseCaseTest {
    final NotificationPort port=mock(NotificationPort.class);
    final NotificationUseCase useCase=new NotificationUseCase(port);
    final UUID user=UUID.randomUUID(), id=UUID.randomUUID();
    @Test void boundsPagesAndKeepsRecipientForEveryOperation() {
        useCase.list(user,true,-10,100); verify(port).list(user,true,0,50);
        useCase.list(user,false,3,0); verify(port).list(user,false,3,1);
        useCase.list(user,false,2,20); verify(port).list(user,false,2,20);
        when(port.unreadCount(user)).thenReturn(7L);
        assertThat(useCase.unreadCount(user).unreadCount()).isEqualTo(7);
        useCase.markRead(user,id); verify(port).markRead(user,id);
    }
    @Test void MissingAndOtherAccountIdsStayNotFound() {
        when(port.markRead(user,id)).thenThrow(new ResourceNotFoundException("Notification not found"));
        assertThatThrownBy(()->useCase.markRead(user,id)).isInstanceOf(ResourceNotFoundException.class);
    }
}
