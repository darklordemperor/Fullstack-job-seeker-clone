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
import com.darklordempeor.jobsdb.interfaces.dto.request.EmployerProfileRequest;
import com.darklordempeor.jobsdb.interfaces.dto.request.JobRequest;
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
	private EmployerUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new EmployerUseCase(jobs);
	}

	@Test
	void profileMethodsReturnUserData() {
		UUID userId = UUID.randomUUID();
		EmployerProfileRequest request = new EmployerProfileRequest("Company", "https://example.com", "Description", "Bangkok");

		assertThat(useCase.profile(userId)).containsEntry("userId", userId);
		assertThat(useCase.updateProfile(userId, request))
				.containsEntry("userId", userId)
				.containsEntry("profile", request);
	}

	@Test
	void createJobBuildsDraftJob() {
		UUID employerId = UUID.randomUUID();
		JobRequest request = request("New title");
		when(jobs.save(org.mockito.ArgumentMatchers.any(Job.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Job saved = useCase.createJob(employerId, request);

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

		Job saved = useCase.updateJob(employerId, existing.id(), request("Updated"));

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

		Job saved = useCase.updateStatus(employerId, existing.id(), JobStatus.ACTIVE);

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

		assertThat(useCase.employerJobs(employerId)).isSameAs(expected);
		verify(jobs).findByEmployerId(employerId);
	}

	private JobRequest request(String title) {
		return new JobRequest(title, "Description", "Bangkok", 100, 200, "THB");
	}

	private Job job(UUID employerId, JobStatus status) {
		return new Job(UUID.randomUUID(), employerId, "Title", "Description", "Bangkok", 100, 200, "THB", status, Instant.now());
	}
}
