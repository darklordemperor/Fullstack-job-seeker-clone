package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.interfaces.mapper.ApiCommandMapper;
import com.darklordempeor.jobsdb.application.usecase.jobseeker.JobSeekerUseCase;
import com.darklordempeor.jobsdb.domain.exception.DomainException;
import com.darklordempeor.jobsdb.interfaces.dto.request.JobSeekerProfileRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import java.security.Principal;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/job-seeker")
public class JobSeekerController {
    private final ApiCommandMapper commands;
	private final JobSeekerUseCase useCase;

	public JobSeekerController(ApiCommandMapper commands, JobSeekerUseCase useCase) {
        this.commands = commands;
		this.useCase = useCase;
	}

	@GetMapping("/profile")
	public ApiResponse<com.darklordempeor.jobsdb.application.model.HiringModels.Profile> profile(Principal principal) {
		return ApiResponse.success(useCase.profile(UUID.fromString(principal.getName())), "Profile loaded");
	}

	@PutMapping("/profile")
    @io.swagger.v3.oas.annotations.Operation(summary="Replace the authenticated job seeker's profile", description="ROLE_JOB_SEEKER. Work experiences replace the current list (maximum 100). Company and title are required, at most 180 characters each. Dates are optional ISO yyyy-MM-dd; when both are set, endDate must be on or after startDate. Validation failures return 400 with ApiResponse success=false. Existing application snapshots remain unchanged.")
	public ApiResponse<com.darklordempeor.jobsdb.application.model.HiringModels.Profile> updateProfile(Principal principal, @Valid @RequestBody JobSeekerProfileRequest request) {
		return ApiResponse.success(useCase.updateProfile(UUID.fromString(principal.getName()), commands.toCommand(request)), "Profile updated");
	}

	@PostMapping(path = "/profile/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ApiResponse<com.darklordempeor.jobsdb.application.model.HiringModels.Profile> uploadProfileImage(Principal principal, @RequestPart("file") MultipartFile file) {
		try {
			return ApiResponse.success(useCase.uploadProfileImage(UUID.fromString(principal.getName()), file.getOriginalFilename(),
					file.getContentType(), file.getBytes()), "Profile image updated");
		} catch (IOException ex) {
			throw new DomainException("Could not read profile image");
		}
	}
}
