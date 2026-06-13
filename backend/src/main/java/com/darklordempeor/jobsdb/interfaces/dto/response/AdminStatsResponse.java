package com.darklordempeor.jobsdb.interfaces.dto.response;

public record AdminStatsResponse(
		long totalUsers,
		long totalJobSeekers,
		long totalEmployers,
		long totalJobs,
		long activeJobs,
		long totalApplications,
		long newUsersThisMonth,
		long newJobsThisMonth) {
}
