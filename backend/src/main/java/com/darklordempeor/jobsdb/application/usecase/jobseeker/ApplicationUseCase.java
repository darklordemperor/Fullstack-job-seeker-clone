package com.darklordempeor.jobsdb.application.usecase.jobseeker;

import com.darklordempeor.jobsdb.domain.model.ApplicationStatus;
import com.darklordempeor.jobsdb.domain.model.JobApplication;
import com.darklordempeor.jobsdb.domain.repository.ApplicationRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
@org.springframework.transaction.annotation.Transactional
public class ApplicationUseCase {
	private final ApplicationRepository applications;
    private final com.darklordempeor.jobsdb.domain.repository.JobRepository jobs;
    private final com.darklordempeor.jobsdb.application.port.ApplicationWorkflowPort hiring;
    private final com.darklordempeor.jobsdb.application.usecase.notification.NotificationPublisher notifications;
    private final com.darklordempeor.jobsdb.application.port.ResumePort resumes;

	public ApplicationUseCase(ApplicationRepository applications, com.darklordempeor.jobsdb.domain.repository.JobRepository jobs,
            com.darklordempeor.jobsdb.application.port.ApplicationWorkflowPort hiring,
            com.darklordempeor.jobsdb.application.usecase.notification.NotificationPublisher notifications,
            com.darklordempeor.jobsdb.application.port.ResumePort resumes) {
		this.applications = applications;
        this.jobs = jobs;
        this.hiring = hiring;
        this.notifications = notifications;
        this.resumes = resumes;
	}

	public JobApplication apply(UUID jobSeekerId, UUID jobId) {
        var job = jobs.findById(jobId).filter(value -> value.status() == com.darklordempeor.jobsdb.domain.model.JobStatus.ACTIVE)
            .orElseThrow(() -> new com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException("Active job not found"));
        if (hiring.hasApplication(jobSeekerId, jobId)) throw new com.darklordempeor.jobsdb.domain.exception.ConflictException("You have already applied for this job");
        var application = applications.save(new JobApplication(UUID.randomUUID(), jobId, jobSeekerId, ApplicationStatus.SUBMITTED, Instant.now()));
        hiring.captureSubmission(application);
        resumes.attachCurrent(jobSeekerId, application.id());
        notifications.submitted(application, job);
        return application;
	}

	public List<JobApplication> myApplications(UUID jobSeekerId) {
		return applications.findByJobSeekerId(jobSeekerId);
	}
}
