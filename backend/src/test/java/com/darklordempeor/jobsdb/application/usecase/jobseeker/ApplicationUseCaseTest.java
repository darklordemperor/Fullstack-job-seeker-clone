
package com.darklordempeor.jobsdb.application.usecase.jobseeker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

import com.darklordempeor.jobsdb.domain.model.ApplicationStatus;
import com.darklordempeor.jobsdb.domain.model.JobApplication;
import com.darklordempeor.jobsdb.domain.repository.ApplicationRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ApplicationUseCaseTest {
	@Mock
	private ApplicationRepository applications;
    @Mock private com.darklordempeor.jobsdb.domain.repository.JobRepository jobs;
    @Mock private com.darklordempeor.jobsdb.application.port.ApplicationWorkflowPort hiring;
	private ApplicationUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new ApplicationUseCase(applications, jobs, hiring, mock(com.darklordempeor.jobsdb.application.usecase.notification.NotificationPublisher.class), mock(com.darklordempeor.jobsdb.application.port.ResumePort.class));
	}

	@Test
	void applyBuildsSubmittedApplication() {
		UUID jobSeekerId = UUID.randomUUID();
		UUID jobId = UUID.randomUUID();
        when(jobs.findById(jobId)).thenReturn(java.util.Optional.of(new com.darklordempeor.jobsdb.domain.model.Job(jobId, UUID.randomUUID(), "Title", "Description", "Bangkok", 1, 2, "THB", com.darklordempeor.jobsdb.domain.model.JobStatus.ACTIVE, Instant.now())));
		when(applications.save(org.mockito.ArgumentMatchers.any(JobApplication.class)))
				.thenAnswer(invocation -> invocation.getArgument(0));

		JobApplication saved = useCase.apply(jobSeekerId, jobId);

		assertThat(saved.id()).isNotNull();
		assertThat(saved.jobId()).isEqualTo(jobId);
		assertThat(saved.jobSeekerId()).isEqualTo(jobSeekerId);
		assertThat(saved.status()).isEqualTo(ApplicationStatus.SUBMITTED);
		assertThat(saved.appliedAt()).isNotNull();
        verify(hiring).captureSubmission(saved);
	}

	@Test
	void myApplicationsDelegatesToRepository() {
		UUID jobSeekerId = UUID.randomUUID();
		List<JobApplication> expected = List.of(
				new JobApplication(UUID.randomUUID(), UUID.randomUUID(), jobSeekerId, ApplicationStatus.SUBMITTED,
						Instant.now()));
		when(applications.findByJobSeekerId(jobSeekerId)).thenReturn(expected);

		assertThat(useCase.myApplications(jobSeekerId)).isSameAs(expected);
		verify(applications).findByJobSeekerId(jobSeekerId);
	}
@Test void missingInactiveAndDuplicateJobsNeverCreateAnApplication() {
        UUID seeker = UUID.randomUUID(), id = UUID.randomUUID();
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> useCase.apply(seeker, id)).isInstanceOf(com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException.class);
        for (var status : java.util.List.of(com.darklordempeor.jobsdb.domain.model.JobStatus.DRAFT, com.darklordempeor.jobsdb.domain.model.JobStatus.CLOSED)) {
            when(jobs.findById(id)).thenReturn(java.util.Optional.of(new com.darklordempeor.jobsdb.domain.model.Job(id, UUID.randomUUID(), "Title", "Description", "Bangkok", 1, 2, "THB", status, Instant.now())));
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> useCase.apply(seeker, id)).isInstanceOf(com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException.class);
        }
        org.mockito.Mockito.verifyNoInteractions(applications, hiring);
        when(jobs.findById(id)).thenReturn(java.util.Optional.of(new com.darklordempeor.jobsdb.domain.model.Job(id, UUID.randomUUID(), "Title", "Description", "Bangkok", 1, 2, "THB", com.darklordempeor.jobsdb.domain.model.JobStatus.ACTIVE, Instant.now())));
        when(hiring.hasApplication(seeker, id)).thenReturn(true);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> useCase.apply(seeker, id)).isInstanceOf(com.darklordempeor.jobsdb.domain.exception.ConflictException.class);
        org.mockito.Mockito.verifyNoInteractions(applications);
        verify(hiring, org.mockito.Mockito.never()).captureSubmission(org.mockito.ArgumentMatchers.any());
    }
}
