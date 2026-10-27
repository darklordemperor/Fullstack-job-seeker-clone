package com.darklordempeor.jobsdb.application.usecase.employer;

import com.darklordempeor.jobsdb.application.port.ApplicationWorkflowPort;
import com.darklordempeor.jobsdb.application.model.HiringModels.*;
import com.darklordempeor.jobsdb.domain.model.*;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.domain.exception.*;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class HiringUseCaseTest {
    private final ApplicationWorkflowPort hiring = mock(ApplicationWorkflowPort.class);
    private final JobRepository jobs = mock(JobRepository.class);
    private final HiringUseCase useCase = new HiringUseCase(hiring, jobs, mock(com.darklordempeor.jobsdb.application.usecase.notification.NotificationPublisher.class));
    private final UUID employer = UUID.randomUUID(), seeker = UUID.randomUUID(), jobId = UUID.randomUUID(), applicationId = UUID.randomUUID();
    private void fixture(ApplicationStatus status) {
        when(jobs.findById(jobId)).thenReturn(Optional.of(new Job(jobId, employer, "Engineer", "Build", "Bangkok", 1, 2, "THB", JobStatus.ACTIVE, Instant.now())));
        when(hiring.detail(applicationId, true)).thenReturn(new Detail(
            new ApplicationView(applicationId, jobId, seeker, status, Instant.now(), "Engineer", "Company", "Candidate", "candidate@example.com"), null, List.of()));
    }
    @Test void anotherEmployerCannotReadApplicants() {
        when(jobs.findById(jobId)).thenReturn(Optional.of(new Job(jobId, employer, "Engineer", "Build", "", null, null, null, JobStatus.ACTIVE, Instant.now())));
        assertThatThrownBy(() -> useCase.applicants(UUID.randomUUID(), jobId, null, 0, 8)).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(hiring);
    }
    @Test void transitionsRequireExpectedStateAndAllowedDestination() {
        fixture(ApplicationStatus.SUBMITTED);
        assertThatThrownBy(() -> useCase.transition(employer, applicationId, ApplicationStatus.REVIEWING, ApplicationStatus.HIRED, "note")).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> useCase.transition(employer, applicationId, ApplicationStatus.SUBMITTED, ApplicationStatus.HIRED, "note")).isInstanceOf(ConflictException.class);
        useCase.transition(employer, applicationId, ApplicationStatus.SUBMITTED, ApplicationStatus.REVIEWING, "review");
        verify(hiring).transition(applicationId, employer, ApplicationStatus.SUBMITTED, ApplicationStatus.REVIEWING, "review");
    }
    @Test void terminalApplicationsCannotBeReopened() {
        fixture(ApplicationStatus.HIRED);
        assertThatThrownBy(() -> useCase.transition(employer, applicationId, ApplicationStatus.HIRED, ApplicationStatus.REVIEWING, "note")).isInstanceOf(ConflictException.class);
    }
    @Test void candidateCannotReadAnotherCandidatesSnapshot() {
        when(hiring.detail(applicationId, false)).thenReturn(new Detail(new ApplicationView(applicationId, jobId, seeker,
            ApplicationStatus.SUBMITTED, Instant.now(), "", "", "", ""), null, List.of()));
        assertThatThrownBy(() -> useCase.seekerDetail(UUID.randomUUID(), applicationId)).isInstanceOf(ForbiddenException.class);
    }
@Test void missingJobNeverReadsApplicants() {
        assertThatThrownBy(() -> useCase.applicants(employer, jobId, null, 0, 8)).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(hiring);
    }
    @Test void ownerQueriesPreserveFiltersAndClampPagination() {
        fixture(ApplicationStatus.SUBMITTED);
        var expected = new Page<ApplicationView>(List.of(), 0, 1, 0);
        when(hiring.applicants(jobId, ApplicationStatus.REVIEWING, 0, 50)).thenReturn(expected);
        assertThat(useCase.applicants(employer, jobId, ApplicationStatus.REVIEWING, -2, 999)).isSameAs(expected);
        useCase.applicants(employer, jobId, null, 2, 0);
        verify(hiring).applicants(jobId, null, 2, 1);
        assertThat(useCase.employerDetail(employer, applicationId)).isSameAs(hiring.detail(applicationId, true));
        assertThatThrownBy(() -> useCase.employerDetail(UUID.randomUUID(), applicationId)).isInstanceOf(ForbiddenException.class);
    }
    @Test void candidateReadsOwnDetailsAndListsOnlyTheirIdentity() {
        var detail = new Detail(new ApplicationView(applicationId, jobId, seeker, ApplicationStatus.SUBMITTED, Instant.now(), "Title", "Company", "Name", "email"), null, List.of());
        when(hiring.detail(applicationId, false)).thenReturn(detail);
        assertThat(useCase.seekerDetail(seeker, applicationId)).isSameAs(detail);
        var page = new Page<ApplicationView>(List.of(detail.application()), 1, 1, 0);
        when(hiring.mine(seeker, 0, 50)).thenReturn(page);
        when(hiring.mine(seeker)).thenReturn(page.content());
        assertThat(useCase.mine(seeker, -1, 100)).isSameAs(page);
        assertThat(useCase.mine(seeker)).containsExactly(detail.application());
        useCase.mine(seeker, 3, 0);
        verify(hiring).mine(seeker, 3, 1);
        var stats = new EmployerStats(1, 2, 3, 4, 5);
        when(hiring.stats(employer)).thenReturn(stats);
        assertThat(useCase.stats(employer)).isSameAs(stats);
    }
}
