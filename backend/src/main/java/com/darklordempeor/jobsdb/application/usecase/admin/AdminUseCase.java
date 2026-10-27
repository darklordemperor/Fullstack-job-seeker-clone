package com.darklordempeor.jobsdb.application.usecase.admin;

import com.darklordempeor.jobsdb.domain.model.JobStatus;
import com.darklordempeor.jobsdb.domain.model.User;
import com.darklordempeor.jobsdb.domain.model.UserRole;
import com.darklordempeor.jobsdb.domain.exception.DomainException;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import com.darklordempeor.jobsdb.domain.repository.ApplicationRepository;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.domain.repository.UserRepository;
import com.darklordempeor.jobsdb.application.model.AdminStats;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Service;

@Service
@org.springframework.transaction.annotation.Transactional
public class AdminUseCase {
	private final UserRepository users;
	private final JobRepository jobs;
	private final ApplicationRepository applications;
    private final com.darklordempeor.jobsdb.application.port.AdminQueryPort hiring;
    private final com.darklordempeor.jobsdb.application.port.AuditPort audit;

	public AdminUseCase(UserRepository users, JobRepository jobs, ApplicationRepository applications, com.darklordempeor.jobsdb.application.port.AdminQueryPort hiring, com.darklordempeor.jobsdb.application.port.AuditPort audit) {
		this.users = users;
		this.jobs = jobs;
		this.applications = applications;
        this.hiring = hiring;
        this.audit = audit;
	}

    public java.util.List<User> allUsers() { return users.findAll(); }
    public java.util.List<com.darklordempeor.jobsdb.domain.model.JobApplication> allApplications() { return applications.findAll(); }

	public AdminStats stats() {
		Instant monthStart = Instant.now().truncatedTo(ChronoUnit.DAYS).minus(31, ChronoUnit.DAYS);
		return new AdminStats(
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
        audit.audit(actorId, "BAN_USER", "USER", userId, reason);
	}

	public void unbanUser(java.util.UUID userId) {
		User user = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
		users.save(new User(user.id(), user.email(), user.passwordHash(), user.role(), false, user.createdAt()));
	}

	public void deleteApplication(java.util.UUID actorId, java.util.UUID applicationId, String reason) {
        audit.audit(actorId, "DELETE_APPLICATION", "APPLICATION", applicationId, reason);
		applications.deleteById(applicationId);
	}

    public com.darklordempeor.jobsdb.application.model.HiringModels.Page<com.darklordempeor.jobsdb.application.model.HiringModels.UserView> users(int page, int size) {
        return hiring.users(Math.max(0,page), Math.max(1,Math.min(50,size)));
    }
    public com.darklordempeor.jobsdb.application.model.HiringModels.Page<com.darklordempeor.jobsdb.application.model.HiringModels.ApplicationView> applications(int page, int size) {
        return hiring.allApplications(Math.max(0,page), Math.max(1,Math.min(50,size)));
    }

	public void closeJob(java.util.UUID jobId) {
		jobs.findById(jobId).ifPresent(job -> jobs.save(new com.darklordempeor.jobsdb.domain.model.Job(
				job.id(), job.employerId(), job.title(), job.description(), job.location(), job.salaryMin(), job.salaryMax(),
				job.salaryCurrency(), JobStatus.CLOSED, job.createdAt())));
	}
}
