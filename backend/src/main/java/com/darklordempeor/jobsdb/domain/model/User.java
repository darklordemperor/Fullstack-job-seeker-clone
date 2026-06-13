package com.darklordempeor.jobsdb.domain.model;

import java.time.Instant;
import java.util.UUID;

public record User(UUID id, String email, String passwordHash, UserRole role, boolean banned, Instant createdAt) {
}
