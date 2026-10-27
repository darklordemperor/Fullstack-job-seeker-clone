package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.model.HiringModels.*;
import com.darklordempeor.jobsdb.application.usecase.employer.HiringUseCase;
import com.darklordempeor.jobsdb.domain.model.ApplicationStatus;
import com.darklordempeor.jobsdb.interfaces.dto.request.ApplicationStatusRequest;
import com.darklordempeor.jobsdb.interfaces.dto.request.SettingsRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@Tag(name="Hiring", description="Employer-owned applicant pipeline and private candidate workspace")
@io.swagger.v3.oas.annotations.responses.ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="400", description="Invalid request; ApiResponse with success=false, data=null and validation message"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="401", description="Missing, invalid or expired access token"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="403", description="Wrong role or resource belongs to another user"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="404", description="Resource not found"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="409", description="Stale or disallowed status transition")
})
public class HiringController {
    private final com.darklordempeor.jobsdb.application.usecase.jobseeker.CandidateWorkspaceUseCase workspace;
    private final HiringUseCase hiring;
    public HiringController(HiringUseCase hiring, com.darklordempeor.jobsdb.application.usecase.jobseeker.CandidateWorkspaceUseCase workspace) { this.hiring = hiring; this.workspace = workspace; }
    @GetMapping("/api/employer/stats")
    @Operation(summary="Counts derived from the authenticated employer's jobs and applications")
    public ApiResponse<EmployerStats> stats(Principal principal) { return ApiResponse.success(hiring.stats(id(principal)), "Employer stats loaded"); }
    @GetMapping("/api/employer/jobs/{jobId}/applicants/page")
    @Operation(summary="Paginated applicants for an owned job", description="page is zero-based; size is clamped to 1..50; optional status filter")
    public ApiResponse<Page<ApplicationView>> applicants(Principal principal, @PathVariable UUID jobId,
            @RequestParam(required=false) ApplicationStatus status, @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="8") int size) {
        return ApiResponse.success(hiring.applicants(id(principal), jobId, status, page, size), "Applicants loaded");
    }
    @GetMapping("/api/employer/jobs/{jobId}/applicants")
    @Operation(summary="Legacy applicant list; use /page for pagination", description="Returns the first 50 applicants; ownership is required")
    public ApiResponse<List<ApplicationView>> applicantsLegacy(Principal principal, @PathVariable UUID jobId) {
        return ApiResponse.success(hiring.applicants(id(principal), jobId, null, 0, 50).content(), "Applicants loaded");
    }
    @GetMapping("/api/employer/applications/{applicationId}")
    @Operation(summary="Submitted profile snapshot and internal status history for an owned job")
    public ApiResponse<Detail> employerDetail(Principal principal, @PathVariable UUID applicationId) {
        return ApiResponse.success(hiring.employerDetail(id(principal), applicationId), "Application loaded");
    }
    @PatchMapping("/api/employer/applications/{applicationId}/status")
    @Operation(summary="Move an application through the hiring pipeline", description="SUBMITTED → REVIEWING or REJECTED; REVIEWING → HIRED or REJECTED. Stale or terminal transitions return 409. Internal reason is mandatory.")
    public ApiResponse<ApplicationView> transition(Principal principal, @PathVariable UUID applicationId, @Valid @RequestBody ApplicationStatusRequest request) {
        return ApiResponse.success(hiring.transition(id(principal), applicationId, request.expectedStatus(), request.status(), request.reason()), "Application status updated");
    }
    @GetMapping("/api/applications/my/page")
    @Operation(summary="Job seeker's own applications", description="ROLE_JOB_SEEKER; page is zero-based and size is clamped to 1..50")
    public ApiResponse<Page<ApplicationView>> mine(Principal principal, @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="8") int size) {
        return ApiResponse.success(hiring.mine(id(principal), page, size), "Applications loaded");
    }
    @GetMapping("/api/applications/{applicationId}")
    @Operation(summary="Own application snapshot and timeline", description="Internal employer notes and actor identifiers are withheld")
    public ApiResponse<Detail> seekerDetail(Principal principal, @PathVariable UUID applicationId) {
        return ApiResponse.success(hiring.seekerDetail(id(principal), applicationId), "Application loaded");
    }
    @GetMapping("/api/job-seeker/settings")
    @Operation(summary="Job seeker's saved preferences", description="Defaults use the account email and false for both opt-in flags")
    public ApiResponse<Settings> settings(Principal principal) { return ApiResponse.success(workspace.settings(id(principal)), "Settings loaded"); }
    @PutMapping("/api/job-seeker/settings")
    @Operation(summary="Save contact and discovery preferences", description="Contact email does not change login credentials. Recommendation preference is stored; automated recommendation delivery is not enabled.")
    public ApiResponse<Settings> saveSettings(Principal principal, @Valid @RequestBody SettingsRequest request) {
        return ApiResponse.success(workspace.saveSettings(id(principal), new Settings(request.displayName(), request.contactEmail(), request.discoverable(), request.recommendations())), "Settings saved");
    }
    @GetMapping("/api/job-seeker/saved-jobs")
    @Operation(summary="Saved job identifiers for the authenticated job seeker")
    public ApiResponse<List<UUID>> savedJobs(Principal principal) { return ApiResponse.success(workspace.savedJobs(id(principal)), "Saved jobs loaded"); }
    @GetMapping("/api/job-seeker/saved-jobs/page")
    @Operation(summary="Paginated saved job summaries for the authenticated job seeker", description="ROLE_JOB_SEEKER. Zero-based page (negative values become 0); size defaults to 8 and is clamped to 1..50. Newest saves first, job ID breaks ties. Returns jobId, title, companyName, location, status and savedAt, without descriptions or employer identifiers. Closed jobs remain removable; draft jobs have redacted metadata. Deleted jobs disappear. The legacy ID-list endpoint is unchanged.")
    public ApiResponse<Page<SavedJob>> savedJobsPage(Principal principal, @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="8") int size) {
        return ApiResponse.success(workspace.savedJobsPage(id(principal), page, size), "Saved jobs loaded");
    }
    @GetMapping("/api/job-seeker/jobs/{jobId}/state")
    @Operation(summary="Whether the authenticated job seeker has applied to or saved this job")
    public ApiResponse<JobState> jobState(Principal principal, @PathVariable UUID jobId) { return ApiResponse.success(workspace.jobState(id(principal), jobId), "Job state loaded"); }
    @PutMapping("/api/job-seeker/saved-jobs/{jobId}")
    @Operation(summary="Save an active job", description="ROLE_JOB_SEEKER; idempotent; inactive or missing jobs return 404")
    public ApiResponse<Void> saveJob(Principal principal, @PathVariable UUID jobId) { workspace.saveJob(id(principal), jobId); return ApiResponse.success(null, "Job saved"); }
    @DeleteMapping("/api/job-seeker/saved-jobs/{jobId}")
    @Operation(summary="Remove a saved job", description="ROLE_JOB_SEEKER; idempotent")
    public ApiResponse<Void> unsaveJob(Principal principal, @PathVariable UUID jobId) { workspace.unsaveJob(id(principal), jobId); return ApiResponse.success(null, "Job removed"); }
    private UUID id(Principal principal) { return UUID.fromString(principal.getName()); }
}
