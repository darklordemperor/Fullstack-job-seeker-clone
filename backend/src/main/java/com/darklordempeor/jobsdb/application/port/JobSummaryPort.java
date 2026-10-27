package com.darklordempeor.jobsdb.application.port;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface JobSummaryPort {
    record Summary(String companyName, long applicants) {}
    Map<UUID, Summary> summaries(List<UUID> jobIds);
}
