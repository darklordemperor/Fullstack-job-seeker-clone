package com.darklordempeor.jobsdb.application.usecase.employer;

import com.darklordempeor.jobsdb.domain.model.Job;
import com.darklordempeor.jobsdb.domain.model.JobStatus;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.application.model.EmployerProfileCommand;
import com.darklordempeor.jobsdb.application.model.JobCommand;
import com.darklordempeor.jobsdb.application.model.JobView;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class EmployerUseCase {
	private final JobRepository jobs;
    private final JobEnrichment enrichment;
    private final com.darklordempeor.jobsdb.application.port.SavedSearchPort searches;
    private final com.darklordempeor.jobsdb.application.port.CompanyPort hiring;

	public EmployerUseCase(JobRepository jobs, com.darklordempeor.jobsdb.application.port.CompanyPort hiring, JobEnrichment enrichment, com.darklordempeor.jobsdb.application.port.SavedSearchPort searches) {
		this.searches=searches;
		this.jobs = jobs; this.enrichment = enrichment;
        this.hiring = hiring;
	}

	public com.darklordempeor.jobsdb.application.model.HiringModels.Company profile(UUID userId) {
		return hiring.company(userId);
	}

	public com.darklordempeor.jobsdb.application.model.HiringModels.Company updateProfile(UUID userId, EmployerProfileCommand request) {
		return hiring.saveCompany(new com.darklordempeor.jobsdb.application.model.HiringModels.Company(userId, request.companyName(), request.website(), request.description(), request.location()));
	}

	public JobView createJob(UUID employerId, JobCommand request) {
		return enrichment.enrich(jobs.save(new Job(UUID.randomUUID(), employerId, request.title(), request.description(), request.location(),
				request.salaryMin(), request.salaryMax(), request.salaryCurrency(), JobStatus.DRAFT, Instant.now())));
	}

	public JobView updateJob(UUID employerId, UUID jobId, JobCommand request) {
		Job existing = ownedJob(employerId, jobId);
		return enrichment.enrich(jobs.save(new Job(jobId, employerId, request.title(), request.description(), request.location(),
				request.salaryMin(), request.salaryMax(), request.salaryCurrency(), existing.status(), existing.createdAt())));
	}

	@org.springframework.transaction.annotation.Transactional
	public JobView updateStatus(UUID employerId, UUID jobId, JobStatus status) {
		Job existing = ownedJob(employerId, jobId);
		Job saved=jobs.save(new Job(existing.id(), existing.employerId(), existing.title(), existing.description(), existing.location(),
				existing.salaryMin(), existing.salaryMax(), existing.salaryCurrency(), status, existing.createdAt()));
        if (status == JobStatus.ACTIVE) searches.publishFirst(saved);
        return enrichment.enrich(saved);
	}

	public List<JobView> employerJobs(UUID employerId) {
		return enrichment.enrich(jobs.findByEmployerId(employerId));
	}

	private Job ownedJob(UUID employerId, UUID jobId) {
		Job job = jobs.findById(jobId).orElseThrow(() -> new ResourceNotFoundException("Job not found"));
		if (!job.employerId().equals(employerId)) {
			throw new com.darklordempeor.jobsdb.domain.exception.ForbiddenException("Employers can only manage their own jobs");
		}
		return job;
	}
}
