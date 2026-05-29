package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.usecase.admin.AdminUseCase;
import com.darklordempeor.jobsdb.domain.repository.ApplicationRepository;
import com.darklordempeor.jobsdb.domain.repository.UserRepository;
import com.darklordempeor.jobsdb.interfaces.dto.request.BanUserRequest;
import com.darklordempeor.jobsdb.interfaces.dto.request.DeleteApplicationRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.AdminStatsResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApplicationResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.UserResponse;
import com.darklordempeor.jobsdb.interfaces.mapper.ApplicationMapper;
import com.darklordempeor.jobsdb.interfaces.mapper.UserMapper;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
	private final AdminUseCase admin;
	private final UserRepository users;
	private final ApplicationRepository applications;
	private final UserMapper userMapper;
	private final ApplicationMapper applicationMapper;

	public AdminController(AdminUseCase admin, UserRepository users, ApplicationRepository applications, UserMapper userMapper,
			ApplicationMapper applicationMapper) {
		this.admin = admin;
		this.users = users;
		this.applications = applications;
		this.userMapper = userMapper;
		this.applicationMapper = applicationMapper;
	}

	@GetMapping("/stats")
	public ApiResponse<AdminStatsResponse> stats() {
		return ApiResponse.success(admin.stats(), "Admin stats loaded");
	}

	@GetMapping("/users")
	public ApiResponse<List<UserResponse>> users() {
		return ApiResponse.success(users.findAll().stream().map(userMapper::toResponse).toList(), "Users loaded");
	}

	@PostMapping("/users/{id}/ban")
	public ApiResponse<Void> ban(@PathVariable UUID id, @Valid @RequestBody BanUserRequest request) {
		admin.banUser(id, request.reason());
		return ApiResponse.success(null, "User banned");
	}

	@DeleteMapping("/users/{id}/ban")
	public ApiResponse<Void> unban(@PathVariable UUID id) {
		admin.unbanUser(id);
		return ApiResponse.success(null, "User unbanned");
	}

	@GetMapping("/applications")
	public ApiResponse<List<ApplicationResponse>> applications() {
		return ApiResponse.success(applications.findAll().stream().map(applicationMapper::toResponse).toList(), "Applications loaded");
	}

	@DeleteMapping("/applications/{id}")
	public ApiResponse<Void> deleteApplication(@PathVariable UUID id, @Valid @RequestBody DeleteApplicationRequest request) {
		admin.deleteApplication(id, request.reason());
		return ApiResponse.success(null, "Application deleted");
	}

	@PatchMapping("/jobs/{id}/close")
	public ApiResponse<Void> closeJob(@PathVariable UUID id) {
		admin.closeJob(id);
		return ApiResponse.success(null, "Job closed");
	}
}
