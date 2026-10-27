package com.darklordempeor.jobsdb.domain.model;
import java.time.Instant;
import java.util.UUID;
public record SavedSearch(UUID id, String name, String query, String location, Integer salaryMin,
        Integer salaryMax, String currency, boolean enabled, Instant createdAt) {}
