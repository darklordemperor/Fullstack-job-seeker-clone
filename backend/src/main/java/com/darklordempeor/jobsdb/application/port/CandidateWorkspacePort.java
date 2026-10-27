package com.darklordempeor.jobsdb.application.port;

import com.darklordempeor.jobsdb.application.model.HiringModels.*;
import java.util.List;
import java.util.UUID;

public interface CandidateWorkspacePort {
    JobState jobState(UUID userId, UUID jobId);
    Settings settings(UUID userId);
    Settings saveSettings(UUID userId, Settings settings);
    List<UUID> savedJobs(UUID userId);
    Page<SavedJob> savedJobsPage(UUID userId, int page, int size);
    void saveJob(UUID userId, UUID jobId);
    void unsaveJob(UUID userId, UUID jobId);
}
