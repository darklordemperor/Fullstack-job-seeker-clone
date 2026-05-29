package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.usecase.employer.EmployerUseCase;
import com.darklordempeor.jobsdb.interfaces.dto.request.EmployerProfileRequest;
import com.darklordempeor.jobsdb.interfaces.dto.request.JobRequest;
import com.darklordempeor.jobsdb.interfaces.dto.request.JobStatusRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.JobResponse;
import com.darklordempeor.jobsdb.interfaces.mapper.JobMapper;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.Map;
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
	private final EmployerUseCase employer;
	private final JobMapper mapper;

	public EmployerController(EmployerUseCase employer, JobMapper mapper) {
		this.employer = employer;
		this.mapper = mapper;
	}

	@GetMapping("/api/employer/profile")
	public ApiResponse<Map<String, Object>> profile(Principal principal) {
		return ApiResponse.success(employer.profile(UUID.fromString(principal.getName())), "Employer profile loaded");
	}

	@PutMapping("/api/employer/profile")
	public ApiResponse<Map<String, Object>> updateProfile(Principal principal, @Valid @RequestBody EmployerProfileRequest request) {
		return ApiResponse.success(employer.updateProfile(UUID.fromString(principal.getName()), request), "Employer profile updated");
	}

	@PostMapping("/api/jobs")
	public ApiResponse<JobResponse> createJob(Principal principal, @Valid @RequestBody JobRequest request) {
		return ApiResponse.success(mapper.toResponse(employer.createJob(UUID.fromString(principal.getName()), request)), "Job created");
	}

	@PutMapping("/api/jobs/{id}")
	public ApiResponse<JobResponse> updateJob(Principal principal, @PathVariable UUID id, @Valid @RequestBody JobRequest request) {
		return ApiResponse.success(mapper.toResponse(employer.updateJob(UUID.fromString(principal.getName()), id, request)), "Job updated");
	}

	@PatchMapping("/api/jobs/{id}/status")
	public ApiResponse<JobResponse> status(Principal principal, @PathVariable UUID id, @Valid @RequestBody JobStatusRequest request) {
		return ApiResponse.success(mapper.toResponse(employer.updateStatus(UUID.fromString(principal.getName()), id, request.status())), "Job status updated");
	}

	@GetMapping("/api/employer/jobs")
	public ApiResponse<List<JobResponse>> jobs(Principal principal) {
		var data = employer.employerJobs(UUID.fromString(principal.getName())).stream().map(mapper::toResponse).toList();
		return ApiResponse.success(data, "Employer jobs loaded");
	}

	@GetMapping("/api/employer/jobs/{id}/applicants")
	public ApiResponse<List<Object>> applicants(@PathVariable UUID id) {
		return ApiResponse.success(List.of(), "Applicants loaded");
	}
}
