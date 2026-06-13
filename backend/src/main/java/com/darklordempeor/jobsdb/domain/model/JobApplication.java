package com.darklordempeor.jobsdb.domain.model;

import java.time.Instant;
import java.util.UUID;

public record JobApplication(UUID id, UUID jobId, UUID jobSeekerId, ApplicationStatus status, Instant appliedAt) {
}
