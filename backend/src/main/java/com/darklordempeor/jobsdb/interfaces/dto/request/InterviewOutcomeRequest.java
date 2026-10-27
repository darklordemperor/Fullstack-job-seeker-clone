package com.darklordempeor.jobsdb.interfaces.dto.request;
import com.darklordempeor.jobsdb.domain.model.Interview;
import jakarta.validation.constraints.*;
import io.swagger.v3.oas.annotations.media.Schema;
public record InterviewOutcomeRequest(@NotNull @Min(0) Integer expectedVersion,
    @NotNull @Schema(allowableValues={"COMPLETED","NO_SHOW"}, description="Employer-recorded outcome after the selected slot ends") Interview.Status outcome) {}
