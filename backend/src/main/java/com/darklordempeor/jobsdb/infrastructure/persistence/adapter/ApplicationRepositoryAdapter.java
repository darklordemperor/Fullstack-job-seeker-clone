package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.domain.model.JobApplication;
import com.darklordempeor.jobsdb.domain.repository.ApplicationRepository;
import com.darklordempeor.jobsdb.infrastructure.persistence.entity.ApplicationEntity;
import com.darklordempeor.jobsdb.infrastructure.persistence.repository.JpaApplicationRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class ApplicationRepositoryAdapter implements ApplicationRepository {
	private final JpaApplicationRepository applications;

	public ApplicationRepositoryAdapter(JpaApplicationRepository applications) {
		this.applications = applications;
	}

	@Override
	public JobApplication save(JobApplication application) {
		return toDomain(applications.save(toEntity(application)));
	}

	@Override
	public List<JobApplication> findByJobSeekerId(UUID jobSeekerId) {
		return applications.findByJobSeekerId(jobSeekerId).stream().map(this::toDomain).toList();
	}

	@Override
	public List<JobApplication> findAll() {
		return applications.findAll().stream().map(this::toDomain).toList();
	}

	@Override
	public long count() {
		return applications.count();
	}

	@Override
	public void deleteById(UUID id) {
		applications.deleteById(id);
	}

	private JobApplication toDomain(ApplicationEntity entity) {
		return new JobApplication(entity.getId(), entity.getJobId(), entity.getJobSeekerId(), entity.getStatus(), entity.getAppliedAt());
	}

	private ApplicationEntity toEntity(JobApplication application) {
		ApplicationEntity entity = new ApplicationEntity();
		entity.setId(application.id());
		entity.setJobId(application.jobId());
		entity.setJobSeekerId(application.jobSeekerId());
		entity.setStatus(application.status());
		entity.setAppliedAt(application.appliedAt());
		return entity;
	}
}
