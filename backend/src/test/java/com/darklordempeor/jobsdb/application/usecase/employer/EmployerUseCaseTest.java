package com.darklordempeor.jobsdb.application.usecase.employer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.darklordempeor.jobsdb.domain.exception.DomainException;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import com.darklordempeor.jobsdb.domain.model.Job;
import com.darklordempeor.jobsdb.domain.model.JobStatus;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.application.model.EmployerProfileCommand;
import com.darklordempeor.jobsdb.application.model.JobCommand;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EmployerUseCaseTest {
	@Mock
	private JobRepository jobs;
    @Mock private com.darklordempeor.jobsdb.application.port.CompanyPort hiring;
	private EmployerUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new EmployerUseCase(jobs, hiring, new JobEnrichment(ids -> java.util.Map.of()), org.mockito.Mockito.mock(com.darklordempeor.jobsdb.application.port.SavedSearchPort.class));
	}

	@Test
	void profileMethodsReturnUserData() {
		UUID userId = UUID.randomUUID();
		EmployerProfileCommand request = new EmployerProfileCommand("Company", "https://example.com", "Description", "Bangkok");

        var expected = new com.darklordempeor.jobsdb.application.model.HiringModels.Company(userId, "Company", "https://example.com", "Description", "Bangkok");
        when(hiring.company(userId)).thenReturn(expected);
        when(hiring.saveCompany(expected)).thenReturn(expected);
        assertThat(useCase.profile(userId)).isEqualTo(expected);
        assertThat(useCase.updateProfile(userId, request)).isEqualTo(expected);
        verify(hiring).saveCompany(expected);
	}

	@Test
	void createJobBuildsDraftJob() {
		UUID employerId = UUID.randomUUID();
		JobCommand request = request("New title");
		when(jobs.save(org.mockito.ArgumentMatchers.any(Job.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Job saved = useCase.createJob(employerId, request).job();

		assertThat(saved.id()).isNotNull();
		assertThat(saved.employerId()).isEqualTo(employerId);
		assertThat(saved.title()).isEqualTo("New title");
		assertThat(saved.status()).isEqualTo(JobStatus.DRAFT);
		assertThat(saved.createdAt()).isNotNull();
	}

	@Test
	void updateJobPreservesStatusAndCreatedAt() {
		UUID employerId = UUID.randomUUID();
		Job existing = job(employerId, JobStatus.ACTIVE);
		when(jobs.findById(existing.id())).thenReturn(Optional.of(existing));
		when(jobs.save(org.mockito.ArgumentMatchers.any(Job.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Job saved = useCase.updateJob(employerId, existing.id(), request("Updated")).job();

		assertThat(saved.title()).isEqualTo("Updated");
		assertThat(saved.status()).isEqualTo(JobStatus.ACTIVE);
		assertThat(saved.createdAt()).isEqualTo(existing.createdAt());
	}

	@Test
	void updateStatusPreservesExistingJobDetails() {
		UUID employerId = UUID.randomUUID();
		Job existing = job(employerId, JobStatus.DRAFT);
		when(jobs.findById(existing.id())).thenReturn(Optional.of(existing));
		when(jobs.save(org.mockito.ArgumentMatchers.any(Job.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Job saved = useCase.updateStatus(employerId, existing.id(), JobStatus.ACTIVE).job();

		assertThat(saved).isEqualTo(new Job(existing.id(), existing.employerId(), existing.title(), existing.description(),
				existing.location(), existing.salaryMin(), existing.salaryMax(), existing.salaryCurrency(), JobStatus.ACTIVE,
				existing.createdAt()));
	}

	@Test
	void updateRejectsMissingAndOtherEmployersJobs() {
		UUID employerId = UUID.randomUUID();
		UUID missingId = UUID.randomUUID();
		when(jobs.findById(missingId)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> useCase.updateJob(employerId, missingId, request("Updated")))
				.isInstanceOf(ResourceNotFoundException.class);

		Job otherEmployersJob = job(UUID.randomUUID(), JobStatus.DRAFT);
		when(jobs.findById(otherEmployersJob.id())).thenReturn(Optional.of(otherEmployersJob));
		assertThatThrownBy(() -> useCase.updateStatus(employerId, otherEmployersJob.id(), JobStatus.ACTIVE))
				.isInstanceOf(DomainException.class);
	}

	@Test
	void employerJobsDelegatesToRepository() {
		UUID employerId = UUID.randomUUID();
		List<Job> expected = List.of(job(employerId, JobStatus.ACTIVE));
		when(jobs.findByEmployerId(employerId)).thenReturn(expected);

		assertThat(useCase.employerJobs(employerId)).extracting(view -> view.job()).containsExactlyElementsOf(expected);
		verify(jobs).findByEmployerId(employerId);
	}

	private JobCommand request(String title) {
		return new JobCommand(title, "Description", "Bangkok", 100, 200, "THB");
	}

	private Job job(UUID employerId, JobStatus status) {
		return new Job(UUID.randomUUID(), employerId, "Title", "Description", "Bangkok", 100, 200, "THB", status, Instant.now());
	}
}
