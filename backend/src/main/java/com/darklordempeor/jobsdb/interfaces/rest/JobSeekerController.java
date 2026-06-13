package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.usecase.jobseeker.JobSeekerUseCase;
import com.darklordempeor.jobsdb.domain.exception.DomainException;
import com.darklordempeor.jobsdb.interfaces.dto.request.JobSeekerProfileRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import java.security.Principal;
import java.util.Map;
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

	@PostMapping(path = "/profile/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ApiResponse<Map<String, Object>> uploadProfileImage(Principal principal, @RequestPart("file") MultipartFile file) {
		try {
			return ApiResponse.success(useCase.uploadProfileImage(UUID.fromString(principal.getName()), file.getOriginalFilename(),
					file.getContentType(), file.getBytes()), "Profile image updated");
		} catch (IOException ex) {
			throw new DomainException("Could not read profile image");
		}
	}
}
