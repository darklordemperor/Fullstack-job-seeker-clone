package com.darklordempeor.jobsdb.application.usecase.employer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import com.darklordempeor.jobsdb.domain.model.Job;
import com.darklordempeor.jobsdb.domain.model.JobStatus;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobQueryUseCaseTest {
	@Mock
	private JobRepository jobs;
	private JobQueryUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new JobQueryUseCase(jobs, new JobEnrichment(ids -> java.util.Map.of()));
	}

	@Test
	void publicJobsNormalizesSearchValues() {
		List<Job> expected = List.of(job());
		when(jobs.findAllPublic(1, 20, "java", "")).thenReturn(expected);

		assertThat(useCase.publicJobs(1, 20, " java ", "  ")).extracting(view -> view.job()).containsExactlyElementsOf(expected);
		verify(jobs).findAllPublic(1, 20, "java", "");
	}

	@Test
	void browseClampsPaginationAndKeepsEmptyPageMetadata() {
        when(jobs.countPublic("java", "")).thenReturn(0L);
        when(jobs.findAllPublic(0, 8, "java", "")).thenReturn(List.of());
        var result = useCase.browse(-1, 100, " java ", null);
        assertThat(result.content()).isEmpty();
        assertThat(result.page()).isZero();
        assertThat(result.totalElements()).isZero();
        assertThat(result.totalPages()).isEqualTo(1);
        verify(jobs).findAllPublic(0, 8, "java", "");

        when(jobs.findAllPublic(0, 1, "java", "")).thenReturn(List.of());
        useCase.browse(0, 0, "java", null);
        verify(jobs).findAllPublic(0, 1, "java", "");
    }

    @Test
	void countPublicJobsNormalizesNullValues() {
		when(jobs.countPublic("", "")).thenReturn(3L);
		assertThat(useCase.countPublicJobs(null, null)).isEqualTo(3);
	}

	@Test
	void findReturnsExistingJobAndRejectsMissingJob() {
		Job job = job();
		when(jobs.findById(job.id())).thenReturn(Optional.of(job));
		assertThat(useCase.find(job.id()).job()).isSameAs(job);

		UUID missingId = UUID.randomUUID();
		when(jobs.findById(missingId)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> useCase.find(missingId))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessage("Job not found");
	}

    @Test void publicDetailHidesDraftAndClosedJobs() {
        Job active = job();
        for (JobStatus status : List.of(JobStatus.DRAFT, JobStatus.CLOSED)) {
            when(jobs.findById(active.id())).thenReturn(Optional.of(new Job(active.id(), active.employerId(), active.title(), active.description(), active.location(), active.salaryMin(), active.salaryMax(), active.salaryCurrency(), status, active.createdAt())));
            assertThatThrownBy(() -> useCase.find(active.id())).isInstanceOf(ResourceNotFoundException.class);
        }
    }
	private Job job() {
		return new Job(UUID.randomUUID(), UUID.randomUUID(), "Title", "Description", "Bangkok", 100, 200, "THB",
				JobStatus.ACTIVE, Instant.now());
	}
}
