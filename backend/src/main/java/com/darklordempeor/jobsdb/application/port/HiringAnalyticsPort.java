package com.darklordempeor.jobsdb.application.port;

import com.darklordempeor.jobsdb.application.model.AnalyticsModels.Totals;
import java.time.Instant;
import java.util.UUID;

public interface HiringAnalyticsPort {
    Totals summarize(UUID employer, UUID jobId, Instant fromInclusive, Instant toExclusive, Instant asOf);
}
