package com.darklordempeor.jobsdb.application.usecase.jobseeker;

import com.darklordempeor.jobsdb.domain.model.ApplicationStatus;
import com.darklordempeor.jobsdb.domain.model.JobApplication;
import com.darklordempeor.jobsdb.domain.repository.ApplicationRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ApplicationUseCase {
	private final ApplicationRepository applications;

	public ApplicationUseCase(ApplicationRepository applications) {
		this.applications = applications;
	}

	public JobApplication apply(UUID jobSeekerId, UUID jobId) {
		return applications.save(new JobApplication(UUID.randomUUID(), jobId, jobSeekerId, ApplicationStatus.SUBMITTED, Instant.now()));
	}

	public List<JobApplication> myApplications(UUID jobSeekerId) {
		return applications.findByJobSeekerId(jobSeekerId);
	}
}
