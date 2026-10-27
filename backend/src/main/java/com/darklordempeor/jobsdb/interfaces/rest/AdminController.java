package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.interfaces.mapper.ApiCommandMapper;
import com.darklordempeor.jobsdb.application.usecase.admin.AdminUseCase;
import com.darklordempeor.jobsdb.interfaces.dto.request.BanUserRequest;
import com.darklordempeor.jobsdb.interfaces.dto.request.DeleteApplicationRequest;
import com.darklordempeor.jobsdb.interfaces.dto.response.AdminStatsResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApplicationResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.UserResponse;
import com.darklordempeor.jobsdb.interfaces.mapper.ApplicationMapper;
import com.darklordempeor.jobsdb.interfaces.mapper.UserMapper;
import jakarta.validation.Valid;
import java.security.Principal;
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
    private final ApiCommandMapper commands;
	private final AdminUseCase admin;
	private final UserMapper userMapper;
	private final ApplicationMapper applicationMapper;

	public AdminController(ApiCommandMapper commands, AdminUseCase admin, UserMapper userMapper,
			ApplicationMapper applicationMapper) {
        this.commands = commands;
		this.admin = admin;
		this.userMapper = userMapper;
		this.applicationMapper = applicationMapper;
	}

	@GetMapping("/stats")
	public ApiResponse<AdminStatsResponse> stats() {
		return ApiResponse.success(commands.toResponse(admin.stats()), "Admin stats loaded");
	}

	@GetMapping("/users")
	public ApiResponse<List<UserResponse>> users() {
		return ApiResponse.success(admin.allUsers().stream().map(userMapper::toResponse).toList(), "Users loaded");
	}

	@PostMapping("/users/{id}/ban")
	public ApiResponse<Void> ban(Principal principal, @PathVariable UUID id, @Valid @RequestBody BanUserRequest request) {
		admin.banUser(UUID.fromString(principal.getName()), id, request.reason());
		return ApiResponse.success(null, "User banned");
	}

	@DeleteMapping("/users/{id}/ban")
	public ApiResponse<Void> unban(@PathVariable UUID id) {
		admin.unbanUser(id);
		return ApiResponse.success(null, "User unbanned");
	}

	@GetMapping("/applications")
	public ApiResponse<List<ApplicationResponse>> applications() {
		return ApiResponse.success(admin.allApplications().stream().map(applicationMapper::toResponse).toList(), "Applications loaded");
	}

	@DeleteMapping("/applications/{id}")
	public ApiResponse<Void> deleteApplication(Principal principal, @PathVariable UUID id, @Valid @RequestBody DeleteApplicationRequest request) {
		admin.deleteApplication(UUID.fromString(principal.getName()), id, request.reason());
		return ApiResponse.success(null, "Application deleted");
	}
    @GetMapping("/users/page")
    public ApiResponse<com.darklordempeor.jobsdb.application.model.HiringModels.Page<com.darklordempeor.jobsdb.application.model.HiringModels.UserView>> usersPage(
        @org.springframework.web.bind.annotation.RequestParam(defaultValue="0") int page, @org.springframework.web.bind.annotation.RequestParam(defaultValue="8") int size) {
        return ApiResponse.success(admin.users(page,size), "Users loaded");
    }
    @GetMapping("/applications/page")
    public ApiResponse<com.darklordempeor.jobsdb.application.model.HiringModels.Page<com.darklordempeor.jobsdb.application.model.HiringModels.ApplicationView>> applicationsPage(
        @org.springframework.web.bind.annotation.RequestParam(defaultValue="0") int page, @org.springframework.web.bind.annotation.RequestParam(defaultValue="8") int size) {
        return ApiResponse.success(admin.applications(page,size), "Applications loaded");
    }

	@PatchMapping("/jobs/{id}/close")
	public ApiResponse<Void> closeJob(@PathVariable UUID id) {
		admin.closeJob(id);
		return ApiResponse.success(null, "Job closed");
	}
}
