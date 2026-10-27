package com.darklordempeor.jobsdb.application.usecase.employer;

import com.darklordempeor.jobsdb.application.model.AnalyticsModels.*;
import com.darklordempeor.jobsdb.application.port.HiringAnalyticsPort;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.domain.exception.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly=true)
public class HiringAnalyticsUseCase {
    private final HiringAnalyticsPort analytics;
    private final JobRepository jobs;
    public HiringAnalyticsUseCase(HiringAnalyticsPort analytics, JobRepository jobs) { this.analytics=analytics; this.jobs=jobs; }
    public Report report(UUID employer, LocalDate from, LocalDate to, UUID jobId) {
        var asOf=Instant.now();
        var today=asOf.atZone(ZoneOffset.UTC).toLocalDate();
        if (to==null) to=today;
        if (from==null) from=to.minusDays(29);
        if (from.isAfter(to) || to.isAfter(today) || ChronoUnit.DAYS.between(from,to)>365)
            throw new DomainException("Choose an ordered UTC date range of at most 366 days, ending no later than today");
        if(jobId!=null) {
            var job=jobs.findById(jobId).orElseThrow(()->new ResourceNotFoundException("Job not found"));
            if(!employer.equals(job.employerId())) throw new ForbiddenException("Analytics are available only for your own jobs");
        }
        var result=analytics.summarize(employer,jobId,from.atStartOfDay(ZoneOffset.UTC).toInstant(),to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant(),asOf);
        return new Report(from,to,asOf,jobId,result.applications(),result.applications()-result.withSubmissionHistory(),
            List.of(new Stage("SUBMITTED",result.applications(),percent(result.applications(),result.applications())),
                new Stage("REVIEWING",result.reviewed(),percent(result.reviewed(),result.applications())),
                new Stage("HIRED",result.hired(),percent(result.hired(),result.applications()))),
            List.of(new StatusCount("SUBMITTED",result.submittedNow()),new StatusCount("REVIEWING",result.reviewingNow()),
                new StatusCount("HIRED",result.hiredNow()),new StatusCount("REJECTED",result.rejectedNow())),
            new TimeToHire(result.hired(),round(result.averageDays()),round(result.medianDays()),result.hiresWithoutTimestamp()));
    }
    private Double percent(long value,long total) { return total==0 ? null : round(100.0*value/total); }
    private Double round(Double value) { return value==null ? null : BigDecimal.valueOf(value).setScale(2,RoundingMode.HALF_UP).doubleValue(); }
}
