package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.usecase.interview.ScorecardUseCase;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.domain.model.Scorecard;
import com.darklordempeor.jobsdb.interfaces.dto.request.ScorecardRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import com.darklordempeor.jobsdb.interfaces.mapper.ApiCommandMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/employer/interviews/{interviewId}/scorecard")
@Tag(name="Interview scorecards",description="Private feedback for the employer owning the interview's job. One per round. Never included in candidate responses or notifications.")
@io.swagger.v3.oas.annotations.security.SecurityRequirement(name="bearer-jwt")
@io.swagger.v3.oas.annotations.responses.ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="400",description="Invalid ratings/notes/version or incomplete finalization; standard error envelope"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="401",description="Access token required"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="403",description="Wrong role or another employer's interview"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="404",description="Interview not found"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="409",description="Stale version, finalized scorecard, closed interview or interview not completed for finalization")
})
public class ScorecardController {
    private final ScorecardUseCase useCase;
    private final ApiCommandMapper mapper;
    public ScorecardController(ScorecardUseCase useCase,ApiCommandMapper mapper) { this.useCase=useCase;this.mapper=mapper; }
    @GetMapping @Operation(summary="Load a private scorecard",description="Returns data=null before the first save. Does not create a draft. No actor IDs or candidate contact data.")
    public ApiResponse<Scorecard> get(Principal p,@PathVariable UUID interviewId) { return ApiResponse.success(useCase.get(id(p),interviewId),"Scorecard loaded"); }
    @PutMapping @Operation(summary="Save a draft",description="Partial ratings and recommendation allowed. Notes are trimmed; maximum 2000 characters each. PROPOSED/CONFIRMED/COMPLETED interviews only. expectedVersion=0 creates version 1; every save increments and records a private revision atomically.")
    public ApiResponse<Scorecard> save(Principal p,@PathVariable UUID interviewId,@Valid @RequestBody ScorecardRequest request) { return ApiResponse.success(useCase.save(id(p),interviewId,mapper.toCommand(request),false),"Draft saved"); }
    @PostMapping("/finalize") @Operation(summary="Finalize feedback",description="Saves the supplied form and finalizes atomically. Requires COMPLETED interview, all three 1–5 ratings, recommendation and at least one nonblank note. Finalized scorecards cannot be edited or reopened. No automatic hiring/rejection or candidate notification.")
    public ApiResponse<Scorecard> finalizeScorecard(Principal p,@PathVariable UUID interviewId,@Valid @RequestBody ScorecardRequest request) { return ApiResponse.success(useCase.save(id(p),interviewId,mapper.toCommand(request),true),"Scorecard finalized"); }
    @GetMapping("/history") @Operation(summary="Paginated private revision history",description="Newest version first. Zero-based page clamped to >=0, size clamped to 1–50 (default 8). Empty before first save. Same owner-only authorization as current feedback.")
    public ApiResponse<Page<Scorecard>> history(Principal p,@PathVariable UUID interviewId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="8") int size) { return ApiResponse.success(useCase.history(id(p),interviewId,page,size),"Scorecard history loaded"); }
    private UUID id(Principal p) { return UUID.fromString(p.getName()); }
}
