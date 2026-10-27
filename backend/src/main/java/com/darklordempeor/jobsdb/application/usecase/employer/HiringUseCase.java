package com.darklordempeor.jobsdb.application.usecase.employer;

import com.darklordempeor.jobsdb.application.model.HiringModels.*;
import com.darklordempeor.jobsdb.application.port.ApplicationWorkflowPort;
import com.darklordempeor.jobsdb.domain.exception.*;
import com.darklordempeor.jobsdb.domain.model.ApplicationStatus;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.domain.service.ApplicationTransitions;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class HiringUseCase {
    private final ApplicationWorkflowPort hiring;
    private final JobRepository jobs;
    private final com.darklordempeor.jobsdb.application.usecase.notification.NotificationPublisher notifications;
    public HiringUseCase(ApplicationWorkflowPort hiring, JobRepository jobs, com.darklordempeor.jobsdb.application.usecase.notification.NotificationPublisher notifications) { this.hiring = hiring; this.jobs = jobs; this.notifications=notifications; }
    public EmployerStats stats(UUID employer) { return hiring.stats(employer); }
    public Page<ApplicationView> applicants(UUID employer, UUID jobId, ApplicationStatus status, int page, int size) {
        ownedJob(employer, jobId);
        return hiring.applicants(jobId, status, Math.max(0, page), size(size));
    }
    public Detail employerDetail(UUID employer, UUID id) {
        Detail detail = hiring.detail(id, true);
        ownedJob(employer, detail.application().jobId());
        return detail;
    }
    public Detail seekerDetail(UUID seeker, UUID id) {
        Detail detail = hiring.detail(id, false);
        if (!detail.application().jobSeekerId().equals(seeker)) throw new ForbiddenException("This application belongs to another job seeker");
        return detail;
    }
    public ApplicationView transition(UUID employer, UUID id, ApplicationStatus expected, ApplicationStatus next, String note) {
        Detail detail = employerDetail(employer, id);
        if (detail.application().status() != expected) throw new ConflictException("Application changed; reload before updating");
        ApplicationTransitions.requireAllowed(expected, next);
        var updated = hiring.transition(id, employer, expected, next, note);
        notifications.statusChanged(updated);
        return updated;
    }
    public Page<ApplicationView> mine(UUID user, int page, int size) { return hiring.mine(user, Math.max(0, page), size(size)); }
    public List<ApplicationView> mine(UUID user) { return hiring.mine(user); }
    private void ownedJob(UUID user, UUID jobId) {
        var job = jobs.findById(jobId).orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        if (!job.employerId().equals(user)) throw new ForbiddenException("Employers can only access applicants for their own jobs");
    }
    private int size(int size) { return Math.max(1, Math.min(50, size)); }
}
