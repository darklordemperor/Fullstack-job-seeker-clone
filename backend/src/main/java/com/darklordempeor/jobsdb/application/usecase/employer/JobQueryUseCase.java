package com.darklordempeor.jobsdb.application.usecase.employer;

import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import com.darklordempeor.jobsdb.domain.model.Job;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.application.model.JobView;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class JobQueryUseCase {
	private final JobRepository jobs;
    private final JobEnrichment enrichment;

	public JobQueryUseCase(JobRepository jobs, JobEnrichment enrichment) {
		this.jobs = jobs; this.enrichment = enrichment;
	}

	public List<JobView> publicJobs(int page, int size, String query, String location) {
		return enrichment.enrich(jobs.findAllPublic(page, size, normalize(query), normalize(location)));
	}

    public com.darklordempeor.jobsdb.application.model.HiringModels.Page<JobView> browse(int page, int size, String query, String location) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(8, size));
        long total = countPublicJobs(query, location);
        return com.darklordempeor.jobsdb.application.model.HiringModels.Page.of(
                publicJobs(safePage, safeSize, query, location), total, safePage, safeSize);
    }

	public long countPublicJobs(String query, String location) {
		return jobs.countPublic(normalize(query), normalize(location));
	}

	public JobView find(UUID id) {
		return enrichment.enrich(jobs.findById(id).filter(job -> job.status() == com.darklordempeor.jobsdb.domain.model.JobStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found")));
	}

	private String normalize(String value) {
		return value == null || value.isBlank() ? "" : value.trim();
	}
}
