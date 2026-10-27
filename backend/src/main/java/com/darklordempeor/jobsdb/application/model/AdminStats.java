package com.darklordempeor.jobsdb.application.model;

public record AdminStats(
		long totalUsers,
		long totalJobSeekers,
		long totalEmployers,
		long totalJobs,
		long activeJobs,
		long totalApplications,
		long newUsersThisMonth,
		long newJobsThisMonth) {
}
