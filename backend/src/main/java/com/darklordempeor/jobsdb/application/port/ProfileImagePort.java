package com.darklordempeor.jobsdb.application.port;

import java.util.UUID;

public interface ProfileImagePort {
	String store(UUID userId, String originalFilename, String contentType, byte[] bytes);
}
