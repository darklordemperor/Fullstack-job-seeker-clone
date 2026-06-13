package com.darklordempeor.jobsdb.application.port;

import com.darklordempeor.jobsdb.interfaces.dto.request.JobSeekerProfileRequest;
import java.util.Map;
import java.util.UUID;

public interface JobSeekerProfilePort {
	Map<String, Object> findOrCreate(UUID userId);
	Map<String, Object> update(UUID userId, JobSeekerProfileRequest request);
	Map<String, Object> updateImage(UUID userId, String profileImageUrl);
}
