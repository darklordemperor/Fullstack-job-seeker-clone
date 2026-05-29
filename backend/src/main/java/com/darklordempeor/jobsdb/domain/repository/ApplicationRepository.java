package com.darklordempeor.jobsdb.domain.repository;

import com.darklordempeor.jobsdb.domain.model.JobApplication;
import java.util.List;
import java.util.UUID;

public interface ApplicationRepository {
	JobApplication save(JobApplication application);
	List<JobApplication> findByJobSeekerId(UUID jobSeekerId);
	List<JobApplication> findAll();
	long count();
	void deleteById(UUID id);
}
