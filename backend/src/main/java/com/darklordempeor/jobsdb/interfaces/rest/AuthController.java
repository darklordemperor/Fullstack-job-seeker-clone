package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.usecase.auth.AuthUseCase;
import com.darklordempeor.jobsdb.domain.model.UserRole;
import com.darklordempeor.jobsdb.interfaces.dto.request.LoginRequest;
import com.darklordempeor.jobsdb.interfaces.dto.request.RefreshTokenRequest;
import com.darklordempeor.jobsdb.interfaces.dto.request.RegisterRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.AuthResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	private final AuthUseCase auth;

	public AuthController(AuthUseCase auth) {
		this.auth = auth;
	}

	@PostMapping("/register/job-seeker")
	public ApiResponse<AuthResponse> registerJobSeeker(@Valid @RequestBody RegisterRequest request) {
		return ApiResponse.success(auth.register(request, UserRole.ROLE_JOB_SEEKER), "Job seeker registered");
	}

	@PostMapping("/register/employer")
	public ApiResponse<AuthResponse> registerEmployer(@Valid @RequestBody RegisterRequest request) {
		return ApiResponse.success(auth.register(request, UserRole.ROLE_EMPLOYER), "Employer registered");
	}

	@PostMapping("/login")
	public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
		return ApiResponse.success(auth.login(request), "Logged in");
	}

	@PostMapping("/refresh-token")
	public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
		return ApiResponse.success(auth.refresh(request.refreshToken()), "Token refreshed");
	}
}
