package com.darklordempeor.jobsdb.interfaces.rest;
import com.darklordempeor.jobsdb.application.usecase.jobseeker.SavedSearchUseCase;
import com.darklordempeor.jobsdb.domain.model.SavedSearch;
import com.darklordempeor.jobsdb.interfaces.dto.request.SavedSearchRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.*;
import com.darklordempeor.jobsdb.interfaces.mapper.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.security.Principal;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/job-seeker/saved-searches")
@Tag(name="Saved searches",description="ROLE_JOB_SEEKER only. Private saved criteria and in-app alerts; no email delivery.")
@io.swagger.v3.oas.annotations.security.SecurityRequirement(name="bearer-jwt")
@io.swagger.v3.oas.annotations.responses.ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="200",description="ApiResponse containing the result"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="400",description="Invalid criteria, UUID or page; failure envelope"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="401",description="Authentication required"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="403",description="Job-seeker role required"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="404",description="Search missing or owned by another candidate"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="409",description="Duplicate criteria or 20-search limit reached")
})
public class SavedSearchController {
    private final SavedSearchUseCase searches;
    private final ApiCommandMapper commands;
    private final JobResponseAssembler jobs;
    public SavedSearchController(SavedSearchUseCase searches,ApiCommandMapper commands,JobResponseAssembler jobs) { this.searches=searches; this.commands=commands; this.jobs=jobs; }
    public record EnabledRequest(@NotNull Boolean enabled) {}
    @GetMapping @Operation(summary="List my saved searches",description="At most 20 items, newest first; no user identifiers returned.")
    public ApiResponse<List<SavedSearch>> list(Principal p) { return ApiResponse.success(searches.list(id(p)),"Saved searches loaded"); }
    @PostMapping @Operation(summary="Save search and enable alerts",description="At least one keyword/location/salary filter. Salary minimum must not exceed maximum. Blank text is normalized; criteria duplicates are case-insensitive. Alerts only for future first publications; overlapping searches yield one alert per job.")
    public ApiResponse<SavedSearch> create(Principal p,@Valid @RequestBody SavedSearchRequest request) { return ApiResponse.success(searches.create(id(p),commands.toCommand(request)),"Search saved"); }
    @PatchMapping("/{searchId}") @Operation(summary="Pause or resume alerts",description="Body: {enabled:boolean}. Idempotent. Resuming does not backfill jobs published while paused.")
    public ApiResponse<SavedSearch> enabled(Principal p,@PathVariable UUID searchId,@Valid @RequestBody EnabledRequest request) { return ApiResponse.success(searches.setEnabled(id(p),searchId,request.enabled()),"Search updated"); }
    @DeleteMapping("/{searchId}") @Operation(summary="Delete my saved search",description="Stops future matching; existing inbox notifications are retained.")
    public ApiResponse<Void> delete(Principal p,@PathVariable UUID searchId) { searches.delete(id(p),searchId); return ApiResponse.success(null,"Search deleted"); }
    @GetMapping("/{searchId}/jobs") @Operation(summary="Browse current matches",description="Active jobs only, including for paused searches. Literal case-insensitive keyword/location; inclusive salary overlap in the chosen currency. Undisclosed required salary bounds do not match. Eight results per page, zero-based page clamped to 0; newest first with UUID tie-breaker. Existing public JobResponse and pagination shape.")
    public ApiResponse<PagedResponse<JobResponse>> matches(Principal p,@PathVariable UUID searchId,@RequestParam(defaultValue="0") int page) {
        var result=searches.matches(id(p),searchId,page);
        return ApiResponse.success(new PagedResponse<>(jobs.toResponses(result.content()),result.totalElements(),result.totalPages(),result.page()),"Matching jobs loaded");
    }
    private UUID id(Principal p) { return UUID.fromString(p.getName()); }
}
