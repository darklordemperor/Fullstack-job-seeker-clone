package com.darklordempeor.jobsdb.domain.model;

import java.time.Instant;
import java.util.UUID;

public final class Resume {
    private Resume() {}
    public record Metadata(UUID id, String fileName, int sizeBytes, Instant createdAt) {}
    public record Version(UUID id, String fileName, int sizeBytes, Instant createdAt, boolean current, boolean attached) {}
    public record Download(String fileName, byte[] content) {}
}
