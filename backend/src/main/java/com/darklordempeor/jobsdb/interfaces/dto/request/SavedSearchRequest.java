package com.darklordempeor.jobsdb.interfaces.dto.request;
import jakarta.validation.constraints.*;
import io.swagger.v3.oas.annotations.media.Schema;
public record SavedSearchRequest(
    @NotBlank @Size(max=80) @Schema(example="Bangkok Java roles") String name,
    @Size(max=150) @Schema(example="Java",description="Literal case-insensitive substring in title or description") String query,
    @Size(max=100) @Schema(example="Bangkok") String location,
    @PositiveOrZero @Schema(example="50000",description="Minimum overlapping advertised salary; inclusive") Integer salaryMin,
    @PositiveOrZero @Schema(example="100000",description="Maximum overlapping advertised salary; inclusive") Integer salaryMax,
    @Size(max=3) @Schema(example="THB",description="Required with salary bounds; three letters, normalized uppercase") String currency) {}
