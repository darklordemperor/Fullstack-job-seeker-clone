package com.darklordempeor.jobsdb.interfaces.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ApplicationResponse(UUID id, UUID jobId, UUID jobSeekerId, String status, Instant appliedAt) {
}
