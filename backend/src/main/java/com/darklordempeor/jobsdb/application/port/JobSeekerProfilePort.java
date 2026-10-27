package com.darklordempeor.jobsdb.application.port;

import com.darklordempeor.jobsdb.application.model.JobSeekerProfileCommand;
import com.darklordempeor.jobsdb.application.model.HiringModels.Profile;
import java.util.UUID;

public interface JobSeekerProfilePort {
	Profile findOrCreate(UUID userId);
	Profile update(UUID userId, JobSeekerProfileCommand request);
	Profile updateImage(UUID userId, String profileImageUrl);
}
