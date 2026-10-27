package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.interfaces.mapper.ApiCommandMapper;
import com.darklordempeor.jobsdb.application.usecase.employer.EmployerUseCase;
import com.darklordempeor.jobsdb.interfaces.dto.request.EmployerProfileRequest;
import com.darklordempeor.jobsdb.interfaces.dto.request.JobRequest;
import com.darklordempeor.jobsdb.interfaces.dto.request.JobStatusRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.JobResponse;
import com.darklordempeor.jobsdb.interfaces.mapper.JobResponseAssembler;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class EmployerController {
    private final ApiCommandMapper commands;
	private final EmployerUseCase employer;
	private final JobResponseAssembler mapper;

	public EmployerController(ApiCommandMapper commands, EmployerUseCase employer, JobResponseAssembler mapper) {
        this.commands = commands;
		this.employer = employer;
		this.mapper = mapper;
	}

	@GetMapping("/api/employer/profile")
	public ApiResponse<com.darklordempeor.jobsdb.application.model.HiringModels.Company> profile(Principal principal) {
		return ApiResponse.success(employer.profile(UUID.fromString(principal.getName())), "Employer profile loaded");
	}

	@PutMapping("/api/employer/profile")
	public ApiResponse<com.darklordempeor.jobsdb.application.model.HiringModels.Company> updateProfile(Principal principal, @Valid @RequestBody EmployerProfileRequest request) {
		return ApiResponse.success(employer.updateProfile(UUID.fromString(principal.getName()), commands.toCommand(request)), "Employer profile updated");
	}

	@PostMapping("/api/jobs")
	public ApiResponse<JobResponse> createJob(Principal principal, @Valid @RequestBody JobRequest request) {
		return ApiResponse.success(mapper.toResponse(employer.createJob(UUID.fromString(principal.getName()), commands.toCommand(request))), "Job created");
	}

	@PutMapping("/api/jobs/{id}")
	public ApiResponse<JobResponse> updateJob(Principal principal, @PathVariable UUID id, @Valid @RequestBody JobRequest request) {
		return ApiResponse.success(mapper.toResponse(employer.updateJob(UUID.fromString(principal.getName()), id, commands.toCommand(request))), "Job updated");
	}

	@PatchMapping("/api/jobs/{id}/status")
	public ApiResponse<JobResponse> status(Principal principal, @PathVariable UUID id, @Valid @RequestBody JobStatusRequest request) {
		return ApiResponse.success(mapper.toResponse(employer.updateStatus(UUID.fromString(principal.getName()), id, request.status())), "Job status updated");
	}

	@GetMapping("/api/employer/jobs")
	public ApiResponse<List<JobResponse>> jobs(Principal principal) {
		var data = mapper.toResponses(employer.employerJobs(UUID.fromString(principal.getName())));
		return ApiResponse.success(data, "Employer jobs loaded");
	}

}
