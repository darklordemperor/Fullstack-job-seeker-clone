package com.darklordempeor.jobsdb.interfaces.dto.request;
import jakarta.validation.constraints.*;
import java.util.UUID;
import io.swagger.v3.oas.annotations.media.Schema;
public record InterviewDecisionRequest(@NotNull @Min(0) Integer expectedVersion,
    @Schema(description="Required only when accepting; must belong to the current invitation") UUID slotId) {}
