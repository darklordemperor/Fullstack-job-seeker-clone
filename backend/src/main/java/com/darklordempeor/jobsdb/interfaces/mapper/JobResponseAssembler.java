package com.darklordempeor.jobsdb.interfaces.mapper;
import com.darklordempeor.jobsdb.application.model.JobView;
import com.darklordempeor.jobsdb.interfaces.dto.response.JobResponse;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class JobResponseAssembler {
    public JobResponse toResponse(JobView view) {
        var job = view.job();
        return new JobResponse(job.id(), job.employerId(), job.title(), job.description(), job.location(),
            job.salaryMin(), job.salaryMax(), job.salaryCurrency(), job.status().name(), job.createdAt(), view.companyName(), view.applicants());
    }
    public List<JobResponse> toResponses(List<JobView> jobs) { return jobs.stream().map(this::toResponse).toList(); }
}
