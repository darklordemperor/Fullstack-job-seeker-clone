package com.darklordempeor.jobsdb.interfaces.dto.response;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(UUID id, String email, String role, boolean banned, Instant createdAt) {
}
