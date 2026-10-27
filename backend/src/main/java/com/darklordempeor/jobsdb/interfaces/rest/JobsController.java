package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.usecase.employer.JobQueryUseCase;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.JobResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.PagedResponse;
import com.darklordempeor.jobsdb.interfaces.mapper.JobResponseAssembler;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/jobs")
@io.swagger.v3.oas.annotations.security.SecurityRequirements
public class JobsController {
	private final JobQueryUseCase jobs;
	private final JobResponseAssembler mapper;

	public JobsController(JobQueryUseCase jobs, JobResponseAssembler mapper) {
		this.jobs = jobs;
		this.mapper = mapper;
	}

	@GetMapping
    @io.swagger.v3.oas.annotations.Operation(summary="Browse active jobs", description="Case-insensitive title/description substring search and location filter. Zero-based page; size clamped to 1..8. Includes companyName and applicants count.")
	public ApiResponse<PagedResponse<JobResponse>> list(
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "8") int size,
			@RequestParam(required = false) String q,
			@RequestParam(required = false) String location) {
		var result = jobs.browse(page, size, q, location);
		return ApiResponse.success(new PagedResponse<>(mapper.toResponses(result.content()), result.totalElements(), result.totalPages(), result.page()), "Jobs loaded");
	}

	@GetMapping("/{id}")
    @io.swagger.v3.oas.annotations.Operation(summary="View an active job", description="Draft, closed and missing jobs return 404.")
	public ApiResponse<JobResponse> get(@PathVariable UUID id) {
		return ApiResponse.success(mapper.toResponse(jobs.find(id)), "Job loaded");
	}
}
