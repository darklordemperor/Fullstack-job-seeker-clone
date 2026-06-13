
package com.darklordempeor.jobsdb.application.usecase.jobseeker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
	private ApplicationUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new ApplicationUseCase(applications);
	}

	@Test
	void applyBuildsSubmittedApplication() {
		UUID jobSeekerId = UUID.randomUUID();
		UUID jobId = UUID.randomUUID();
		when(applications.save(org.mockito.ArgumentMatchers.any(JobApplication.class)))
				.thenAnswer(invocation -> invocation.getArgument(0));

		JobApplication saved = useCase.apply(jobSeekerId, jobId);

		assertThat(saved.id()).isNotNull();
		assertThat(saved.jobId()).isEqualTo(jobId);
		assertThat(saved.jobSeekerId()).isEqualTo(jobSeekerId);
		assertThat(saved.status()).isEqualTo(ApplicationStatus.SUBMITTED);
		assertThat(saved.appliedAt()).isNotNull();
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
}
