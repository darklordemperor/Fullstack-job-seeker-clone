package com.darklordempeor.jobsdb.application.usecase.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.darklordempeor.jobsdb.domain.exception.DomainException;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import com.darklordempeor.jobsdb.domain.model.Job;
import com.darklordempeor.jobsdb.domain.model.JobStatus;
import com.darklordempeor.jobsdb.domain.model.User;
import com.darklordempeor.jobsdb.domain.model.UserRole;
import com.darklordempeor.jobsdb.domain.repository.ApplicationRepository;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.domain.repository.UserRepository;
import com.darklordempeor.jobsdb.interfaces.dto.response.AdminStatsResponse;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminUseCaseTest {
	@Mock private UserRepository users;
	@Mock private JobRepository jobs;
	@Mock private ApplicationRepository applications;
	private AdminUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new AdminUseCase(users, jobs, applications);
	}

	@Test
	void statsCollectsRepositoryCounts() {
		when(users.count()).thenReturn(10L);
		when(users.countByRole(UserRole.ROLE_JOB_SEEKER)).thenReturn(6L);
		when(users.countByRole(UserRole.ROLE_EMPLOYER)).thenReturn(3L);
		when(jobs.count()).thenReturn(8L);
		when(jobs.countActive()).thenReturn(5L);
		when(applications.count()).thenReturn(7L);
		when(users.countCreatedSince(any())).thenReturn(2L);
		when(jobs.countCreatedSince(any())).thenReturn(4L);

		assertThat(useCase.stats()).isEqualTo(new AdminStatsResponse(10, 6, 3, 8, 5, 7, 2, 4));
	}

	@Test
	void banUserMarksUserAsBanned() {
		UUID actorId = UUID.randomUUID();
		User user = user(false);
		when(users.findById(user.id())).thenReturn(Optional.of(user));

		useCase.banUser(actorId, user.id(), "reason");

		ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
		verify(users).save(captor.capture());
		assertThat(captor.getValue()).isEqualTo(new User(user.id(), user.email(), user.passwordHash(), user.role(), true, user.createdAt()));
	}

	@Test
	void banUserRejectsSelfBanAndMissingUser() {
		UUID actorId = UUID.randomUUID();
		assertThatThrownBy(() -> useCase.banUser(actorId, actorId, "reason"))
				.isInstanceOf(DomainException.class);
		verify(users, never()).findById(any());

		UUID missingId = UUID.randomUUID();
		when(users.findById(missingId)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> useCase.banUser(actorId, missingId, "reason"))
				.isInstanceOf(ResourceNotFoundException.class);
	}

	@Test
	void unbanUserMarksUserAsNotBannedAndRejectsMissingUser() {
		User user = user(true);
		when(users.findById(user.id())).thenReturn(Optional.of(user));
		useCase.unbanUser(user.id());

		ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
		verify(users).save(captor.capture());
		assertThat(captor.getValue().banned()).isFalse();

		UUID missingId = UUID.randomUUID();
		when(users.findById(missingId)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> useCase.unbanUser(missingId))
				.isInstanceOf(ResourceNotFoundException.class);
	}

	@Test
	void deleteApplicationDelegatesToRepository() {
		UUID applicationId = UUID.randomUUID();
		useCase.deleteApplication(applicationId, "reason");
		verify(applications).deleteById(applicationId);
	}

	@Test
	void closeJobChangesExistingJobStatusAndIgnoresMissingJob() {
		Job job = job(JobStatus.ACTIVE);
		when(jobs.findById(job.id())).thenReturn(Optional.of(job));
		useCase.closeJob(job.id());

		ArgumentCaptor<Job> captor = ArgumentCaptor.forClass(Job.class);
		verify(jobs).save(captor.capture());
		assertThat(captor.getValue().status()).isEqualTo(JobStatus.CLOSED);

		UUID missingId = UUID.randomUUID();
		when(jobs.findById(missingId)).thenReturn(Optional.empty());
		useCase.closeJob(missingId);
		verify(jobs).findById(missingId);
	}

	private User user(boolean banned) {
		return new User(UUID.randomUUID(), "user@example.com", "hash", UserRole.ROLE_JOB_SEEKER, banned, Instant.now());
	}

	private Job job(JobStatus status) {
		return new Job(UUID.randomUUID(), UUID.randomUUID(), "Title", "Description", "Bangkok", 1, 2, "THB", status, Instant.now());
	}
}
