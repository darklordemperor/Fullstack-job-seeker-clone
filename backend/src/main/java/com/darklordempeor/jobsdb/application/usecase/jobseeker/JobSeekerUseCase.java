package com.darklordempeor.jobsdb.application.usecase.jobseeker;

import com.darklordempeor.jobsdb.application.port.JobSeekerProfilePort;
import com.darklordempeor.jobsdb.application.port.ProfileImagePort;
import com.darklordempeor.jobsdb.interfaces.dto.request.JobSeekerProfileRequest;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class JobSeekerUseCase {
	private final JobSeekerProfilePort profiles;
	private final ProfileImagePort profileImages;

	public JobSeekerUseCase(JobSeekerProfilePort profiles, ProfileImagePort profileImages) {
		this.profiles = profiles;
		this.profileImages = profileImages;
	}

	public Map<String, Object> profile(UUID userId) {
		return profiles.findOrCreate(userId);
	}

	public Map<String, Object> updateProfile(UUID userId, JobSeekerProfileRequest request) {
		return profiles.update(userId, request);
	}

	public Map<String, Object> uploadProfileImage(UUID userId, String originalFilename, String contentType, byte[] bytes) {
		return profiles.updateImage(userId, profileImages.store(userId, originalFilename, contentType, bytes));
	}
}
