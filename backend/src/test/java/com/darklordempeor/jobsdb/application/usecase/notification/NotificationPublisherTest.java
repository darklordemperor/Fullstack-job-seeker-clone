package com.darklordempeor.jobsdb.application.usecase.notification;

import com.darklordempeor.jobsdb.application.port.NotificationPort;
import com.darklordempeor.jobsdb.application.model.HiringModels.ApplicationView;
import com.darklordempeor.jobsdb.domain.model.*;
import com.darklordempeor.jobsdb.domain.model.Notification.Kind;
import java.util.*;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class NotificationPublisherTest {
    final NotificationPort port=mock(NotificationPort.class);
    final NotificationPublisher publisher=new NotificationPublisher(port);
    final UUID employer=UUID.randomUUID(), candidate=UUID.randomUUID(), application=UUID.randomUUID(), jobId=UUID.randomUUID(), id=UUID.randomUUID();
    @Test void applicationEventsTargetOppositePartyWithoutPrivateFields() {
        var job=new Job(jobId,employer,"Engineer","Description","Bangkok",1,2,"THB",JobStatus.ACTIVE,Instant.now());
        publisher.submitted(new JobApplication(application,jobId,candidate,ApplicationStatus.SUBMITTED,Instant.now()),job);
        verify(port).publish(argThat(n->n.recipientId().equals(employer) && n.kind()==Kind.NEW_APPLICATION && n.href().contains("applicationId="+application) && n.eventKey().equals("application:"+application+":submitted")));
        publisher.statusChanged(new ApplicationView(application,jobId,candidate,ApplicationStatus.REVIEWING,Instant.now(),"Engineer","Company","Private name","private@example.com"));
        verify(port).publish(argThat(n->n.recipientId().equals(candidate) && n.kind()==Kind.APPLICATION_STATUS && n.message().contains("REVIEWING") && !n.message().contains("private@example.com") && n.href().startsWith("/job-seeker/")));
    }
    @Test void everyInterviewEventUsesStableVersionKeyAndCorrectDestination() {
        var value=new Interview(id,application,employer,candidate,Interview.Status.PROPOSED,Interview.Mode.IN_PERSON,"Private location","UTC",List.of(),null,4,Instant.now(),Instant.now());
        for (var kind:Kind.values()) {
            if (kind==Kind.JOB_MATCH || kind==Kind.NEW_APPLICATION || kind==Kind.APPLICATION_STATUS) continue;
            publisher.interview(value,kind,candidate);
            verify(port).publish(argThat(n->n.kind()==kind && n.recipientId().equals(candidate) && n.href().equals("/job-seeker/interviews?interviewId="+id) && n.eventKey().equals("interview:"+id+":4") && !n.message().contains("Private location")));
        }
        publisher.interview(value,Kind.INTERVIEW_CONFIRMED,employer);
        verify(port).publish(argThat(n->n.recipientId().equals(employer) && n.href().startsWith("/employer/")));
        assertThatThrownBy(()->publisher.interview(value,Kind.NEW_APPLICATION,candidate)).isInstanceOf(IllegalArgumentException.class);
    }
}
