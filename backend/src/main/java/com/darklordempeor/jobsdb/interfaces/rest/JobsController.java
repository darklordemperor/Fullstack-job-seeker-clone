package com.darklordempeor.jobsdb.interfaces.rest;

import com.darklordempeor.jobsdb.application.usecase.employer.JobQueryUseCase;
import com.darklordempeor.jobsdb.interfaces.dto.response.ApiResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.JobResponse;
import com.darklordempeor.jobsdb.interfaces.dto.response.PagedResponse;
import com.darklordempeor.jobsdb.interfaces.mapper.JobMapper;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/jobs")
public class JobsController {
	private final JobQueryUseCase jobs;
	private final JobMapper mapper;

	public JobsController(JobQueryUseCase jobs, JobMapper mapper) {
		this.jobs = jobs;
		this.mapper = mapper;
	}

	@GetMapping
	public ApiResponse<PagedResponse<JobResponse>> list(
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size,
			@RequestParam(required = false) String q) {
		var content = jobs.publicJobs(page, size, q).stream().map(mapper::toResponse).toList();
		return ApiResponse.success(new PagedResponse<>(content, content.size(), 1, page), "Jobs loaded");
	}

	@GetMapping("/{id}")
	public ApiResponse<JobResponse> get(@PathVariable UUID id) {
		return ApiResponse.success(mapper.toResponse(jobs.find(id)), "Job loaded");
	}
}
