package com.darklordempeor.jobsdb.application.usecase.jobseeker;

import com.darklordempeor.jobsdb.interfaces.dto.request.JobSeekerProfileRequest;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class JobSeekerUseCase {
	public Map<String, Object> profile(UUID userId) {
		return Map.of("userId", userId);
	}

	public Map<String, Object> updateProfile(UUID userId, JobSeekerProfileRequest request) {
		return Map.of("userId", userId, "profile", request);
	}
}
