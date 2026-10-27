package com.darklordempeor.jobsdb.interfaces.dto.request;
import com.darklordempeor.jobsdb.domain.model.Interview;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

public record InterviewProposalRequest(
    @NotNull Interview.Mode mode,
    @NotBlank @Size(max=1000) @Schema(description="HTTPS meeting URL for ONLINE; street address/room for IN_PERSON", example="https://meet.example.com/interview") String location,
    @NotBlank @Size(max=100) @Schema(description="IANA timezone of the organizer; slots are absolute UTC instants", example="Asia/Bangkok") String timezone,
    @NotNull @Size(min=1,max=3) List<@NotNull @Valid SlotRequest> slots) {
    public record SlotRequest(
        @NotNull @Schema(description="Start within the next 365 days, ISO 8601 UTC", example="2026-12-01T03:00:00Z") Instant startsAt,
        @NotNull @Schema(description="15–240 minutes after start; offered slots must not overlap", example="2026-12-01T04:00:00Z") Instant endsAt) {}
}
