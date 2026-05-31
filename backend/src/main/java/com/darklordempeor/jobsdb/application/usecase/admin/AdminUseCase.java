package com.darklordempeor.jobsdb.application.usecase.admin;

import com.darklordempeor.jobsdb.domain.model.JobStatus;
import com.darklordempeor.jobsdb.domain.model.User;
import com.darklordempeor.jobsdb.domain.model.UserRole;
import com.darklordempeor.jobsdb.domain.exception.DomainException;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import com.darklordempeor.jobsdb.domain.repository.ApplicationRepository;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.domain.repository.UserRepository;
import com.darklordempeor.jobsdb.interfaces.dto.response.AdminStatsResponse;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Service;

@Service
public class AdminUseCase {
	private final UserRepository users;
	private final JobRepository jobs;
	private final ApplicationRepository applications;

	public AdminUseCase(UserRepository users, JobRepository jobs, ApplicationRepository applications) {
		this.users = users;
		this.jobs = jobs;
		this.applications = applications;
	}

	public AdminStatsResponse stats() {
		Instant monthStart = Instant.now().truncatedTo(ChronoUnit.DAYS).minus(31, ChronoUnit.DAYS);
		return new AdminStatsResponse(
				users.count(),
				users.countByRole(UserRole.ROLE_JOB_SEEKER),
				users.countByRole(UserRole.ROLE_EMPLOYER),
				jobs.count(),
				jobs.countActive(),
				applications.count(),
				users.countCreatedSince(monthStart),
				jobs.countCreatedSince(monthStart));
	}

	public void banUser(java.util.UUID actorId, java.util.UUID userId, String reason) {
		if (actorId.equals(userId)) {
			throw new DomainException("Administrators cannot ban their own account");
		}
		User user = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
		users.save(new User(user.id(), user.email(), user.passwordHash(), user.role(), true, user.createdAt()));
	}

	public void unbanUser(java.util.UUID userId) {
		User user = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
		users.save(new User(user.id(), user.email(), user.passwordHash(), user.role(), false, user.createdAt()));
	}

	public void deleteApplication(java.util.UUID applicationId, String reason) {
		applications.deleteById(applicationId);
	}

	public void closeJob(java.util.UUID jobId) {
		jobs.findById(jobId).ifPresent(job -> jobs.save(new com.darklordempeor.jobsdb.domain.model.Job(
				job.id(), job.employerId(), job.title(), job.description(), job.location(), job.salaryMin(), job.salaryMax(),
				job.salaryCurrency(), JobStatus.CLOSED, job.createdAt())));
	}
}
