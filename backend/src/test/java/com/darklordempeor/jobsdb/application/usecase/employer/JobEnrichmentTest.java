package com.darklordempeor.jobsdb.application.usecase.employer;

import com.darklordempeor.jobsdb.application.port.JobSummaryPort;
import com.darklordempeor.jobsdb.domain.model.Job;
import com.darklordempeor.jobsdb.domain.model.JobStatus;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class JobEnrichmentTest {
    @Test void batchesSummariesAndPreservesOrderWithDefaultsForMissingCompanies() {
        var port = mock(JobSummaryPort.class);
        var first = job(); var second = job();
        when(port.summaries(List.of(first.id(), second.id())))
                .thenReturn(Map.of(first.id(), new JobSummaryPort.Summary("Example", 3)));
        var result = new JobEnrichment(port).enrich(List.of(first, second));
        assertThat(result).extracting(view -> view.job()).containsExactly(first, second);
        assertThat(result.getFirst().companyName()).isEqualTo("Example");
        assertThat(result.getFirst().applicants()).isEqualTo(3);
        assertThat(result.getLast().companyName()).isEmpty();
        assertThat(result.getLast().applicants()).isZero();
        verify(port).summaries(List.of(first.id(), second.id()));
        verifyNoMoreInteractions(port);
    }

    @Test void emptyResultsDoNotQuerySummaries() {
        var port = mock(JobSummaryPort.class);
        assertThat(new JobEnrichment(port).enrich(List.of())).isEmpty();
        verifyNoInteractions(port);
    }

    private Job job() {
        return new Job(UUID.randomUUID(), UUID.randomUUID(), "Title", "Description", "Bangkok", 100, 200, "THB", JobStatus.ACTIVE, Instant.now());
    }
}
