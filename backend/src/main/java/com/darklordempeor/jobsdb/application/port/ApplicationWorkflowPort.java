package com.darklordempeor.jobsdb.application.port;

import com.darklordempeor.jobsdb.application.model.HiringModels.*;
import com.darklordempeor.jobsdb.domain.model.ApplicationStatus;
import com.darklordempeor.jobsdb.domain.model.JobApplication;
import java.util.List;
import java.util.UUID;

public interface ApplicationWorkflowPort {
    EmployerStats stats(UUID employerId);
    boolean hasApplication(UUID userId, UUID jobId);
    void captureSubmission(JobApplication application);
    Page<ApplicationView> applicants(UUID jobId, ApplicationStatus status, int page, int size);
    Page<ApplicationView> mine(UUID userId, int page, int size);
    List<ApplicationView> mine(UUID userId);
    Detail detail(UUID applicationId, boolean employer);
    ApplicationView transition(UUID applicationId, UUID actorId, ApplicationStatus expected, ApplicationStatus next, String note);
}
