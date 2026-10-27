package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.model.InterviewModels.*;
import com.darklordempeor.jobsdb.application.model.InterviewCalendar;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.application.usecase.interview.InterviewUseCase;
import com.darklordempeor.jobsdb.interfaces.dto.request.*;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import com.darklordempeor.jobsdb.interfaces.mapper.ApiCommandMapper;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.UUID;

@RestController
@Tag(name="Interviews", description="Owner-scoped interview invitations; status is independent of application status. Upcoming lists are newest invitations first. Confirmed bookings use half-open time intervals and serialize participant booking checks.")
@io.swagger.v3.oas.annotations.security.SecurityRequirement(name="bearer-jwt")
@io.swagger.v3.oas.annotations.responses.ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="400", description="Invalid input, times, timezone or meeting link; ApiResponse success=false"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="401", description="Access token required"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="403", description="Wrong role or another user's invitation"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="404", description="Application or interview missing"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode="409", description="Stale version, closed invitation, terminal application, expired slot or booking conflict")
})
public class InterviewController {
    private final InterviewUseCase useCase; private final ApiCommandMapper mapper;
    public InterviewController(InterviewUseCase useCase, ApiCommandMapper mapper) { this.useCase=useCase; this.mapper=mapper; }
    @GetMapping("/api/employer/interviews/{interviewId}")
    @Operation(summary="Open a specific employer interview", description="Owner employer only; supports inbox links to any interview, including closed rounds. Returns the same View shape as list items. Other owners return 403; missing IDs return 404.")
    public ApiResponse<View> employerDetail(Principal p,@PathVariable UUID interviewId) { return ApiResponse.success(useCase.detail(id(p),true,interviewId),"Interview loaded"); }
    @GetMapping("/api/job-seeker/interviews/{interviewId}")
    @Operation(summary="Open a specific candidate interview", description="Owner candidate only; same compact View as list items, without actor identifiers or internal notes. Other owners return 403; missing IDs return 404.")
    public ApiResponse<View> candidateDetail(Principal p,@PathVariable UUID interviewId) { return ApiResponse.success(useCase.detail(id(p),false,interviewId),"Interview loaded"); }
    @GetMapping("/api/employer/interviews")
    @Operation(summary="Employer's interviews", description="ROLE_EMPLOYER; upcoming=true excludes closed/expired invitations. page is zero-based, size clamped to 1..50. Set upcoming=false for history.")
    public ApiResponse<Page<View>> employerList(Principal p, @RequestParam(defaultValue="true") boolean upcoming, @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="8") int size) { return ApiResponse.success(useCase.list(id(p),true,upcoming,page,size),"Interviews loaded"); }
    @GetMapping("/api/job-seeker/interviews")
    @Operation(summary="Candidate's interviews", description="ROLE_JOB_SEEKER; page is zero-based, size clamped to 1..50. upcoming=false includes history.")
    public ApiResponse<Page<View>> candidateList(Principal p, @RequestParam(defaultValue="true") boolean upcoming, @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="8") int size) { return ApiResponse.success(useCase.list(id(p),false,upcoming,page,size),"Interviews loaded"); }
    @PostMapping("/api/employer/applications/{applicationId}/interviews")
    @Operation(summary="Propose interview slots for an owned application", description="One active invitation per application. SUBMITTED/REVIEWING only. Slots are offers, not reservations. No email is sent.")
    public ApiResponse<View> propose(Principal p, @PathVariable UUID applicationId, @Valid @RequestBody InterviewProposalRequest request) { return ApiResponse.success(useCase.propose(id(p),applicationId,mapper.toCommand(request)),"Invitation created"); }
    @PutMapping("/api/employer/interviews/{interviewId}")
    @Operation(summary="Reschedule an owned invitation", description="Requires expectedVersion; replaces options and resets status to PROPOSED, releasing any confirmed booking. Candidate must confirm again.")
    public ApiResponse<View> reschedule(Principal p, @PathVariable UUID interviewId, @RequestParam int expectedVersion, @Valid @RequestBody InterviewProposalRequest request) { return ApiResponse.success(useCase.reschedule(id(p),interviewId,expectedVersion,mapper.toCommand(request)),"New times proposed"); }
    @PostMapping("/api/job-seeker/interviews/{interviewId}/accept")
    @Operation(summary="Accept one offered slot", description="Requires slotId and expectedVersion. Locks both participants before testing confirmed overlaps; competing bookings return 409.")
    public ApiResponse<View> accept(Principal p, @PathVariable UUID interviewId, @Valid @RequestBody InterviewDecisionRequest request) { return ApiResponse.success(useCase.accept(id(p),interviewId,request.expectedVersion(),request.slotId()),"Interview confirmed"); }
    @PostMapping("/api/job-seeker/interviews/{interviewId}/decline")
    @Operation(summary="Decline a proposed invitation")
    public ApiResponse<View> decline(Principal p, @PathVariable UUID interviewId, @Valid @RequestBody InterviewDecisionRequest request) { return ApiResponse.success(useCase.decline(id(p),interviewId,request.expectedVersion()),"Invitation declined"); }
    @PostMapping("/api/employer/interviews/{interviewId}/cancel")
    @Operation(summary="Employer cancels an active invitation or confirmed interview")
    public ApiResponse<View> employerCancel(Principal p, @PathVariable UUID interviewId, @Valid @RequestBody InterviewDecisionRequest request) { return ApiResponse.success(useCase.cancel(id(p),true,interviewId,request.expectedVersion()),"Interview cancelled"); }
    @PostMapping("/api/job-seeker/interviews/{interviewId}/cancel")
    @Operation(summary="Candidate cancels an active invitation or confirmed interview")
    public ApiResponse<View> candidateCancel(Principal p, @PathVariable UUID interviewId, @Valid @RequestBody InterviewDecisionRequest request) { return ApiResponse.success(useCase.cancel(id(p),false,interviewId,request.expectedVersion()),"Interview cancelled"); }
    @GetMapping("/api/employer/interviews/{interviewId}/calendar")
    @Operation(summary="Export a confirmed interview", description="ApiResponse containing filename and RFC 5545 content; manual import only, no calendar sync.")
    public ApiResponse<InterviewCalendar.File> employerCalendar(Principal p, @PathVariable UUID interviewId) { return ApiResponse.success(InterviewCalendar.export(useCase.detail(id(p),true,interviewId)),"Calendar exported"); }
    @GetMapping("/api/job-seeker/interviews/{interviewId}/calendar")
    @Operation(summary="Export the candidate's confirmed interview", description="ApiResponse containing filename and RFC 5545 content; no live calendar sync.")
    public ApiResponse<InterviewCalendar.File> candidateCalendar(Principal p, @PathVariable UUID interviewId) { return ApiResponse.success(InterviewCalendar.export(useCase.detail(id(p),false,interviewId)),"Calendar exported"); }
    @PostMapping("/api/employer/interviews/{interviewId}/outcome")
    @Operation(summary="Record interview outcome", description="Owner employer only; expectedVersion required. COMPLETED or NO_SHOW after the confirmed slot ends. Keeps the selected time and closes the round without changing application status.")
    public ApiResponse<View> outcome(Principal p, @PathVariable UUID interviewId, @Valid @RequestBody InterviewOutcomeRequest request) { return ApiResponse.success(useCase.finish(id(p),interviewId,request.expectedVersion(),request.outcome()),"Outcome recorded"); }
    @GetMapping("/api/employer/interviews/{interviewId}/history")
    @Operation(summary="Interview revision history", description="Owner only. Newest version first, page zero-based, size clamped to 1..50. BASELINE marks the earliest retained legacy state; earlier changes cannot be reconstructed.")
    public ApiResponse<Page<Revision>> employerHistory(Principal p, @PathVariable UUID interviewId, @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="10") int size) { return ApiResponse.success(useCase.history(id(p),true,interviewId,page,size),"History loaded"); }
    @GetMapping("/api/job-seeker/interviews/{interviewId}/history")
    @Operation(summary="Candidate's interview revision history", description="Owner only; same bounded pagination. Includes prior slots and locations, never actor identifiers or internal notes.")
    public ApiResponse<Page<Revision>> candidateHistory(Principal p, @PathVariable UUID interviewId, @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="10") int size) { return ApiResponse.success(useCase.history(id(p),false,interviewId,page,size),"History loaded"); }
    private UUID id(Principal p) { return UUID.fromString(p.getName()); }
}
