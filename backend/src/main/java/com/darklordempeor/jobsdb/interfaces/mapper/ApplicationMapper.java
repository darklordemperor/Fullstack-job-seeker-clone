package com.darklordempeor.jobsdb.interfaces.mapper;

import com.darklordempeor.jobsdb.domain.model.JobApplication;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApplicationResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ApplicationMapper {
	default ApplicationResponse toResponse(JobApplication application) {
		return new ApplicationResponse(application.id(), application.jobId(), application.jobSeekerId(),
				application.status().name(), application.appliedAt());
	}
}
