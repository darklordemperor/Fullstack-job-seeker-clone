package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.domain.model.Job;
import com.darklordempeor.jobsdb.domain.model.JobStatus;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.infrastructure.persistence.entity.JobEntity;
import com.darklordempeor.jobsdb.infrastructure.persistence.repository.JpaJobRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

@Repository
public class JobRepositoryAdapter implements JobRepository {
	private final JpaJobRepository jobs;

	public JobRepositoryAdapter(JpaJobRepository jobs) {
		this.jobs = jobs;
	}

	@Override
	public Job save(Job job) {
		return toDomain(jobs.save(toEntity(job)));
	}

	@Override
	public Optional<Job> findById(UUID id) {
		return jobs.findById(id).map(this::toDomain);
	}

	@Override
	public List<Job> findAllPublic(int page, int size, String query, String location) {
		return jobs.findPublicJobs(query, location, PageRequest.of(page, size)).stream().map(this::toDomain).toList();
	}

	@Override
	public long countPublic(String query, String location) {
		return jobs.countPublicJobs(query, location);
	}

	@Override
	public List<Job> findByEmployerId(UUID employerId) {
		return jobs.findByEmployerId(employerId).stream().map(this::toDomain).toList();
	}

	@Override
	public long count() {
		return jobs.count();
	}

	@Override
	public long countActive() {
		return jobs.countByStatus(JobStatus.ACTIVE);
	}

	@Override
	public long countCreatedSince(Instant since) {
		return jobs.countByCreatedAtAfter(since);
	}

	private Job toDomain(JobEntity entity) {
		return new Job(entity.getId(), entity.getEmployerId(), entity.getTitle(), entity.getDescription(), entity.getLocation(),
				entity.getSalaryMin(), entity.getSalaryMax(), entity.getSalaryCurrency(), entity.getStatus(), entity.getCreatedAt());
	}

	private JobEntity toEntity(Job job) {
		JobEntity entity = new JobEntity();
		entity.setId(job.id());
		entity.setEmployerId(job.employerId());
		entity.setTitle(job.title());
		entity.setDescription(job.description());
		entity.setLocation(job.location());
		entity.setSalaryMin(job.salaryMin());
		entity.setSalaryMax(job.salaryMax());
		entity.setSalaryCurrency(job.salaryCurrency());
		entity.setStatus(job.status());
		entity.setCreatedAt(job.createdAt());
		return entity;
	}
}
