package com.darklordempeor.jobsdb.interfaces.dto.request;

import com.darklordempeor.jobsdb.domain.model.ApplicationStatus;
import jakarta.validation.constraints.*;
import io.swagger.v3.oas.annotations.media.Schema;

public record ApplicationStatusRequest(
    @NotNull ApplicationStatus expectedStatus,
    @NotNull ApplicationStatus status,
    @NotBlank @Size(max=2000) @Schema(description="Internal employer note; never included in candidate timelines", example="Completed initial review") String reason) {}
