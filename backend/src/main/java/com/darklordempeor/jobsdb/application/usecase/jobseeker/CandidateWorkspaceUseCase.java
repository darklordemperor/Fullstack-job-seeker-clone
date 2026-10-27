package com.darklordempeor.jobsdb.application.usecase.jobseeker;
import com.darklordempeor.jobsdb.application.model.HiringModels.*;
import com.darklordempeor.jobsdb.application.port.CandidateWorkspacePort;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.domain.model.JobStatus;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CandidateWorkspaceUseCase {
    private final CandidateWorkspacePort hiring;
    private final JobRepository jobs;
    public CandidateWorkspaceUseCase(CandidateWorkspacePort hiring, JobRepository jobs) { this.hiring = hiring; this.jobs = jobs; }
    public Settings settings(UUID user) { return hiring.settings(user); }
    public Settings saveSettings(UUID user, Settings settings) { return hiring.saveSettings(user, settings); }
    public List<UUID> savedJobs(UUID user) { return hiring.savedJobs(user); }
    public Page<SavedJob> savedJobsPage(UUID user, int page, int size) {
        return hiring.savedJobsPage(user, Math.max(0, page), Math.max(1, Math.min(50, size)));
    }
    public JobState jobState(UUID user, UUID job) { return hiring.jobState(user, job); }
    public void saveJob(UUID user, UUID jobId) {
        jobs.findById(jobId).filter(job -> job.status() == JobStatus.ACTIVE).orElseThrow(() -> new ResourceNotFoundException("Active job not found"));
        hiring.saveJob(user, jobId);
    }
    public void unsaveJob(UUID user, UUID jobId) { hiring.unsaveJob(user, jobId); }
}
