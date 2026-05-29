package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.usecase.jobseeker.JobSeekerUseCase;
import com.darklordempeor.jobsdb.interfaces.dto.request.JobSeekerProfileRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/job-seeker")
public class JobSeekerController {
	private final JobSeekerUseCase useCase;

	public JobSeekerController(JobSeekerUseCase useCase) {
		this.useCase = useCase;
	}

	@GetMapping("/profile")
	public ApiResponse<Map<String, Object>> profile(Principal principal) {
		return ApiResponse.success(useCase.profile(UUID.fromString(principal.getName())), "Profile loaded");
	}

	@PutMapping("/profile")
	public ApiResponse<Map<String, Object>> updateProfile(Principal principal, @Valid @RequestBody JobSeekerProfileRequest request) {
		return ApiResponse.success(useCase.updateProfile(UUID.fromString(principal.getName()), request), "Profile updated");
	}
}
