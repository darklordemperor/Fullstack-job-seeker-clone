package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.usecase.jobseeker.ApplicationUseCase;
import com.darklordempeor.jobsdb.interfaces.dto.request.CreateApplicationRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApplicationResponse;
import com.darklordempeor.jobsdb.interfaces.mapper.ApplicationMapper;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/applications")
public class ApplicationsController {
	private final ApplicationUseCase applications;
	private final ApplicationMapper mapper;
    private final com.darklordempeor.jobsdb.application.usecase.employer.HiringUseCase hiring;

	public ApplicationsController(ApplicationUseCase applications, ApplicationMapper mapper,
            com.darklordempeor.jobsdb.application.usecase.employer.HiringUseCase hiring) {
		this.applications = applications;
		this.mapper = mapper;
        this.hiring = hiring;
	}

	@PostMapping
    @io.swagger.v3.oas.annotations.Operation(summary="Submit an application", description="Atomically captures the profile and selected private resume version, if any. Later resume changes never replace the submitted attachment. Existing resumeUrl is preserved in the profile snapshot. Request and response fields are unchanged.")
	public ApiResponse<ApplicationResponse> apply(Principal principal, @Valid @RequestBody CreateApplicationRequest request) {
		return ApiResponse.success(mapper.toResponse(applications.apply(UUID.fromString(principal.getName()), request.jobId())), "Application submitted");
	}

	@GetMapping("/my")
	public ApiResponse<List<com.darklordempeor.jobsdb.application.model.HiringModels.ApplicationView>> mine(Principal principal) {
		var data = hiring.mine(UUID.fromString(principal.getName()));
		return ApiResponse.success(data, "Applications loaded");
	}
}
