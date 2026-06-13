package com.darklordempeor.jobsdb.interfaces.mapper;

import com.darklordempeor.jobsdb.domain.model.Job;
import com.darklordempeor.jobsdb.interfaces.dto.response.JobResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface JobMapper {
	default JobResponse toResponse(Job job) {
		return new JobResponse(job.id(), job.employerId(), job.title(), job.description(), job.location(), job.salaryMin(),
				job.salaryMax(), job.salaryCurrency(), job.status().name(), job.createdAt());
	}
}
