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

	public ApplicationsController(ApplicationUseCase applications, ApplicationMapper mapper) {
		this.applications = applications;
		this.mapper = mapper;
	}

	@PostMapping
	public ApiResponse<ApplicationResponse> apply(Principal principal, @Valid @RequestBody CreateApplicationRequest request) {
		return ApiResponse.success(mapper.toResponse(applications.apply(UUID.fromString(principal.getName()), request.jobId())), "Application submitted");
	}

	@GetMapping("/my")
	public ApiResponse<List<ApplicationResponse>> mine(Principal principal) {
		var data = applications.myApplications(UUID.fromString(principal.getName())).stream().map(mapper::toResponse).toList();
		return ApiResponse.success(data, "Applications loaded");
	}
}
