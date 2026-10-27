package com.darklordempeor.jobsdb.application.usecase.employer;
import com.darklordempeor.jobsdb.application.model.JobView;
import com.darklordempeor.jobsdb.application.port.JobSummaryPort;
import com.darklordempeor.jobsdb.domain.model.Job;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class JobEnrichment {
    private final JobSummaryPort summaries;
    public JobEnrichment(JobSummaryPort summaries) { this.summaries = summaries; }
    public JobView enrich(Job job) { return enrich(List.of(job)).getFirst(); }
    public List<JobView> enrich(List<Job> jobs) {
        if (jobs.isEmpty()) return List.of();
        var extras = summaries.summaries(jobs.stream().map(Job::id).toList());
        return jobs.stream().map(job -> {
            var extra = extras.getOrDefault(job.id(), new JobSummaryPort.Summary("", 0));
            return new JobView(job, extra.companyName(), extra.applicants());
        }).toList();
    }
}
