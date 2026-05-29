package com.darklordempeor.jobsdb.application.usecase.employer;

import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import com.darklordempeor.jobsdb.domain.model.Job;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class JobQueryUseCase {
	private final JobRepository jobs;

	public JobQueryUseCase(JobRepository jobs) {
		this.jobs = jobs;
	}

	public List<Job> publicJobs(int page, int size, String query) {
		return jobs.findAllPublic(page, size, query);
	}

	public Job find(UUID id) {
		return jobs.findById(id).orElseThrow(() -> new ResourceNotFoundException("Job not found"));
	}
}
