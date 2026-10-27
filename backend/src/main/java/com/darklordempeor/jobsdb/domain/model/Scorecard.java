package com.darklordempeor.jobsdb.domain.model;

import java.time.Instant;
import java.util.UUID;

public record Scorecard(UUID interviewId, int version, Status status, Feedback feedback,
                        Instant updatedAt, Instant finalizedAt) {
    public enum Status { DRAFT, FINALIZED }
    public enum Recommendation { STRONG_HIRE, HIRE, HOLD, NO_HIRE }
    public record Feedback(Integer technicalSkills, Integer communication, Integer problemSolving,
                           String strengths, String concerns, Recommendation recommendation) {}
}
