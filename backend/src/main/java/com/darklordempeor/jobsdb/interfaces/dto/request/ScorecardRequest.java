package com.darklordempeor.jobsdb.interfaces.dto.request;

import com.darklordempeor.jobsdb.domain.model.Scorecard;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record ScorecardRequest(
    @NotNull @Min(0) @Schema(description="0 for a new scorecard; otherwise the last loaded scorecard version",example="0") Integer expectedVersion,
    @NotNull @Valid FeedbackRequest feedback) {
    public record FeedbackRequest(
        @Min(1) @Max(5) @Schema(description="1 below expectations; 3 meets; 5 exceeds. Optional in drafts.",example="4") Integer technicalSkills,
        @Min(1) @Max(5) @Schema(example="3") Integer communication,
        @Min(1) @Max(5) @Schema(example="4") Integer problemSolving,
        @Size(max=2000) @Schema(example="Explained tradeoffs clearly using relevant examples.") String strengths,
        @Size(max=2000) @Schema(example="Needs more experience with operational debugging.") String concerns,
        @Schema(description="Required for finalization; does not change application status",example="HIRE") Scorecard.Recommendation recommendation) {}
}
