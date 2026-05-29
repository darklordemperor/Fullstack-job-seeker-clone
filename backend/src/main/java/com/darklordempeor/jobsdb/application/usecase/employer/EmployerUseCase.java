package com.darklordempeor.jobsdb.application.usecase.employer;

import com.darklordempeor.jobsdb.domain.model.Job;
import com.darklordempeor.jobsdb.domain.model.JobStatus;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.interfaces.dto.request.EmployerProfileRequest;
import com.darklordempeor.jobsdb.interfaces.dto.request.JobRequest;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class EmployerUseCase {
	private final JobRepository jobs;

	public EmployerUseCase(JobRepository jobs) {
		this.jobs = jobs;
	}

	public Map<String, Object> profile(UUID userId) {
		return Map.of("userId", userId);
	}

	public Map<String, Object> updateProfile(UUID userId, EmployerProfileRequest request) {
		return Map.of("userId", userId, "profile", request);
	}

	public Job createJob(UUID employerId, JobRequest request) {
		return jobs.save(new Job(UUID.randomUUID(), employerId, request.title(), request.description(), request.location(),
				request.salaryMin(), request.salaryMax(), request.salaryCurrency(), JobStatus.DRAFT, Instant.now()));
	}

	public Job updateJob(UUID employerId, UUID jobId, JobRequest request) {
		return jobs.save(new Job(jobId, employerId, request.title(), request.description(), request.location(),
				request.salaryMin(), request.salaryMax(), request.salaryCurrency(), JobStatus.DRAFT, Instant.now()));
	}

	public Job updateStatus(UUID employerId, UUID jobId, JobStatus status) {
		Job existing = jobs.findById(jobId).orElse(new Job(jobId, employerId, "", "", null, null, null, null, status, Instant.now()));
		return jobs.save(new Job(existing.id(), existing.employerId(), existing.title(), existing.description(), existing.location(),
				existing.salaryMin(), existing.salaryMax(), existing.salaryCurrency(), status, existing.createdAt()));
	}

	public List<Job> employerJobs(UUID employerId) {
		return jobs.findByEmployerId(employerId);
	}
}
