package com.darklordempeor.jobsdb.domain.repository;

import com.darklordempeor.jobsdb.domain.model.Job;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobRepository {
	Job save(Job job);
	Optional<Job> findById(UUID id);
	List<Job> findAllPublic(int page, int size, String query);
	List<Job> findByEmployerId(UUID employerId);
	long count();
	long countActive();
	long countCreatedSince(Instant since);
}
