package com.darklordempeor.jobsdb.application.usecase.employer;

import com.darklordempeor.jobsdb.application.model.AnalyticsModels.Totals;
import com.darklordempeor.jobsdb.application.port.HiringAnalyticsPort;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.domain.model.*;
import com.darklordempeor.jobsdb.domain.exception.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class HiringAnalyticsUseCaseTest {
    final HiringAnalyticsPort port=mock(HiringAnalyticsPort.class);
    final JobRepository jobs=mock(JobRepository.class);
    final HiringAnalyticsUseCase useCase=new HiringAnalyticsUseCase(port,jobs);
    final UUID owner=UUID.randomUUID(),jobId=UUID.randomUUID();
    final Totals empty=new Totals(0,0,0,0,0,0,0,0,0,null,null);
    final LocalDate end=LocalDate.of(2024,1,31);
    void setup(Totals totals) { when(port.summarize(eq(owner),any(),any(),any(),any())).thenReturn(totals); }
    Job job(UUID employer) { return new Job(jobId,employer,"Title","Description","Bangkok",null,null,"THB",JobStatus.ACTIVE,Instant.now()); }
    @Test void emptyReportHasNullRatesAndDurationsAndUtcDefaults() {
        setup(empty); var report=useCase.report(owner,null,null,null);
        assertThat(report.to()).isEqualTo(LocalDate.now(ZoneOffset.UTC)); assertThat(report.from()).isEqualTo(report.to().minusDays(29));
        assertThat(report.funnel()).allMatch(s->s.conversionPercent()==null); assertThat(report.timeToHire().medianDays()).isNull();
        verify(port).summarize(eq(owner),isNull(),eq(report.from().atStartOfDay(ZoneOffset.UTC).toInstant()),eq(report.to().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant()),any());
        assertThat(useCase.report(owner,null,end,null).from()).isEqualTo(end.minusDays(29));
    }
    @Test void percentagesRoundingAndOwnershipAreExplicit() {
        setup(new Totals(3,2,2,1,1,1,1,0,0,1.235,1.235)); when(jobs.findById(jobId)).thenReturn(Optional.of(job(owner)));
        var report=useCase.report(owner,end.minusDays(365),end,jobId);
        assertThat(report.applicationsWithoutSubmissionHistory()).isEqualTo(1); assertThat(report.funnel().get(1).conversionPercent()).isEqualTo(66.67);
        assertThat(report.funnel().get(2).conversionPercent()).isEqualTo(33.33); assertThat(report.timeToHire().averageDays()).isEqualTo(1.24);
        assertThat(report.currentStatuses()).extracting(s->s.applications()).containsExactly(1L,1L,1L,0L);
        when(jobs.findById(jobId)).thenReturn(Optional.of(job(UUID.randomUUID())));
        assertThatThrownBy(()->useCase.report(owner,end,end,jobId)).isInstanceOf(ForbiddenException.class);
        when(jobs.findById(jobId)).thenReturn(Optional.empty());
        assertThatThrownBy(()->useCase.report(owner,end,end,jobId)).isInstanceOf(ResourceNotFoundException.class);
    }
    @Test void invalidRangesNeverReachTheDatabase() {
        assertThatThrownBy(()->useCase.report(owner,end,end.minusDays(1),null)).isInstanceOf(DomainException.class);
        assertThatThrownBy(()->useCase.report(owner,null,LocalDate.now(ZoneOffset.UTC).plusDays(1),null)).isInstanceOf(DomainException.class);
        assertThatThrownBy(()->useCase.report(owner,end.minusDays(366),end,null)).isInstanceOf(DomainException.class);
        verifyNoInteractions(port,jobs);
    }
}
