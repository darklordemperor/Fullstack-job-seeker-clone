package com.darklordempeor.jobsdb.application.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class AnalyticsModels {
    private AnalyticsModels() {}
    public record Totals(long applications, long withSubmissionHistory, long reviewed, long hired,
        long submittedNow, long reviewingNow, long hiredNow, long rejectedNow,
        long hiresWithoutTimestamp, Double averageDays, Double medianDays) {}
    public record Stage(String status, long applications, Double conversionPercent) {}
    public record StatusCount(String status, long applications) {}
    public record TimeToHire(long sampleSize, Double averageDays, Double medianDays, long hiredWithoutTimestamp) {}
    public record Report(LocalDate from, LocalDate to, Instant asOf, UUID jobId, long applications,
        long applicationsWithoutSubmissionHistory, List<Stage> funnel, List<StatusCount> currentStatuses, TimeToHire timeToHire) {}
}
