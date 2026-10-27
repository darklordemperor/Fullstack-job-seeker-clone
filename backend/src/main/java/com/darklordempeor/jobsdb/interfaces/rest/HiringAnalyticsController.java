package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.model.AnalyticsModels.Report;
import com.darklordempeor.jobsdb.application.usecase.employer.HiringAnalyticsUseCase;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.security.Principal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/employer/analytics")
@Tag(name="Hiring analytics",description="Owner-scoped aggregate metrics without candidate identities or private feedback")
@SecurityRequirement(name="bearer-jwt")
public class HiringAnalyticsController {
    private final HiringAnalyticsUseCase useCase;
    public HiringAnalyticsController(HiringAnalyticsUseCase useCase) { this.useCase=useCase; }
    @GetMapping
    @Operation(summary="Application-cohort hiring analytics",description="Selects applications by inclusive UTC submission dates, default last 30 days through today, maximum 366 days. Progress includes recorded events through asOf, even after the selected end date. Funnel stages count distinct applications; each conversionPercent divides by total cohort applications (null when empty), not the preceding stage. Current statuses are separate. Time-to-hire uses earliest valid HIRED event minus submission time in elapsed 24-hour days; average/median rounded to 2 decimals, null with zero samples. Missing history is disclosed, never fabricated. Repeated events never multiply applications. No writes or candidate data.")
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="200",description="Aggregate report in standard success envelope; fixed three funnel stages and four current statuses"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="400",description="Malformed date/UUID, reversed/future range or range over 366 days; standard error envelope"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="401",description="Access token required"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="403",description="Wrong role or another employer's job"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="404",description="Requested job not found")})
    public ApiResponse<Report> report(Principal principal,
        @Parameter(description="Inclusive UTC submission date; defaults to 29 days before to",example="2026-10-01") @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
        @Parameter(description="Inclusive UTC submission date; defaults to today",example="2026-10-25") @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,
        @Parameter(description="Optional owned job ID; omitted means all jobs owned by this employer") @RequestParam(required=false) UUID jobId) {
        return ApiResponse.success(useCase.report(UUID.fromString(principal.getName()),from,to,jobId),"Hiring analytics loaded");
    }
}
