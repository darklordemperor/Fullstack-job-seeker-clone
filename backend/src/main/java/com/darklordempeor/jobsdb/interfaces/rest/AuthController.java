package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.interfaces.mapper.ApiCommandMapper;
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
@io.swagger.v3.oas.annotations.security.SecurityRequirements
public class AuthController {
    private final ApiCommandMapper commands;
	private final AuthUseCase auth;

	public AuthController(ApiCommandMapper commands, AuthUseCase auth) {
        this.commands = commands;
		this.auth = auth;
	}

	@PostMapping("/register/job-seeker")
	public ApiResponse<AuthResponse> registerJobSeeker(@Valid @RequestBody RegisterRequest request) {
		return ApiResponse.success(commands.toResponse(auth.register(commands.toCommand(request), UserRole.ROLE_JOB_SEEKER)), "Job seeker registered");
	}

	@PostMapping("/register/employer")
	public ApiResponse<AuthResponse> registerEmployer(@Valid @RequestBody RegisterRequest request) {
		return ApiResponse.success(commands.toResponse(auth.register(commands.toCommand(request), UserRole.ROLE_EMPLOYER)), "Employer registered");
	}

	@PostMapping("/login")
	public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
		return ApiResponse.success(commands.toResponse(auth.login(commands.toCommand(request))), "Logged in");
	}

	@PostMapping("/refresh-token")
    @io.swagger.v3.oas.annotations.Operation(summary="Rotate a single-use refresh token", description="Returns a new access/refresh pair. Consumed, revoked, expired or access tokens return 401. No Authorization header is required.")
	public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
		return ApiResponse.success(commands.toResponse(auth.refresh(request.refreshToken())), "Token refreshed");
	}

    @PostMapping("/logout")
    @io.swagger.v3.oas.annotations.Operation(summary = "Revoke the supplied refresh token", description="Already revoked valid tokens are accepted. Invalid or expired tokens return 401. Existing access tokens remain valid until their configured expiry.")
    public ApiResponse<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
        auth.logout(request.refreshToken());
        return ApiResponse.success(null, "Signed out");
    }
}
