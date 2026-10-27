package com.darklordempeor.jobsdb.application.usecase.jobseeker;

import com.darklordempeor.jobsdb.application.port.JobSeekerProfilePort;
import com.darklordempeor.jobsdb.application.port.ProfileImagePort;
import com.darklordempeor.jobsdb.application.model.JobSeekerProfileCommand;
import com.darklordempeor.jobsdb.application.model.HiringModels.Profile;
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

	public Profile profile(UUID userId) {
		return profiles.findOrCreate(userId);
	}

	public Profile updateProfile(UUID userId, JobSeekerProfileCommand request) {
		return profiles.update(userId, request);
	}

	public Profile uploadProfileImage(UUID userId, String originalFilename, String contentType, byte[] bytes) {
		return profiles.updateImage(userId, profileImages.store(userId, originalFilename, contentType, bytes));
	}
}
