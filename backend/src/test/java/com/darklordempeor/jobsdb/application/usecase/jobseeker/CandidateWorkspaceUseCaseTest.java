package com.darklordempeor.jobsdb.application.usecase.jobseeker;

import com.darklordempeor.jobsdb.application.port.CandidateWorkspacePort;
import com.darklordempeor.jobsdb.domain.repository.JobRepository;
import com.darklordempeor.jobsdb.domain.model.Job;
import com.darklordempeor.jobsdb.domain.model.JobStatus;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class CandidateWorkspaceUseCaseTest {
    @Test void savedPagesClampBoundsAndPreserveIdentityAndErrors() {
        var workspace = mock(CandidateWorkspacePort.class);
        var useCase = new CandidateWorkspaceUseCase(workspace, mock(JobRepository.class));
        UUID user = UUID.randomUUID();
        var empty = com.darklordempeor.jobsdb.application.model.HiringModels.Page.<com.darklordempeor.jobsdb.application.model.HiringModels.SavedJob>of(java.util.List.of(), 0, 0, 50);
        when(workspace.savedJobsPage(user, 0, 50)).thenReturn(empty);
        org.assertj.core.api.Assertions.assertThat(useCase.savedJobsPage(user, -5, 100)).isSameAs(empty);
        useCase.savedJobsPage(user, 2, 0);
        verify(workspace).savedJobsPage(user, 2, 1);
        when(workspace.savedJobsPage(user, 0, 8)).thenThrow(new IllegalStateException("Offline"));
        assertThatThrownBy(() -> useCase.savedJobsPage(user, 0, 8)).hasMessage("Offline");
    }
    @Test void onlyActiveJobsCanBeSaved() {
        var jobs = mock(JobRepository.class);
        var workspace = mock(CandidateWorkspacePort.class);
        var useCase = new CandidateWorkspaceUseCase(workspace, jobs);
        UUID user = UUID.randomUUID(), id = UUID.randomUUID();
        when(jobs.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> useCase.saveJob(user, id)).isInstanceOf(ResourceNotFoundException.class);
        when(jobs.findById(id)).thenReturn(Optional.of(job(id, JobStatus.CLOSED)));
        assertThatThrownBy(() -> useCase.saveJob(user, id)).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(workspace);
        when(jobs.findById(id)).thenReturn(Optional.of(job(id, JobStatus.ACTIVE)));
        useCase.saveJob(user, id);
        verify(workspace).saveJob(user, id);
    }

    private Job job(UUID id, JobStatus status) {
        return new Job(id, UUID.randomUUID(), "Title", "Description", "Bangkok", 100, 200, "THB", status, Instant.now());
    }
@Test void settingsAndSavedStatePreserveUserIdentityAndFailures() {
        var jobs = mock(JobRepository.class);
        var workspace = mock(CandidateWorkspacePort.class);
        var useCase = new CandidateWorkspaceUseCase(workspace, jobs);
        UUID user = UUID.randomUUID(), id = UUID.randomUUID();
        var settings = new com.darklordempeor.jobsdb.application.model.HiringModels.Settings("Name", "contact@example.com", false, true);
        var state = new com.darklordempeor.jobsdb.application.model.HiringModels.JobState(true, false);
        when(workspace.settings(user)).thenReturn(settings);
        when(workspace.saveSettings(user, settings)).thenReturn(settings);
        when(workspace.savedJobs(user)).thenReturn(java.util.List.of(id));
        when(workspace.jobState(user, id)).thenReturn(state);
        org.assertj.core.api.Assertions.assertThat(useCase.settings(user)).isSameAs(settings);
        org.assertj.core.api.Assertions.assertThat(useCase.saveSettings(user, settings)).isSameAs(settings);
        org.assertj.core.api.Assertions.assertThat(useCase.savedJobs(user)).containsExactly(id);
        org.assertj.core.api.Assertions.assertThat(useCase.jobState(user, id)).isSameAs(state);
        useCase.unsaveJob(user, id);
        verify(workspace).unsaveJob(user, id);
        when(workspace.saveSettings(user, settings)).thenThrow(new IllegalStateException("Storage unavailable"));
        assertThatThrownBy(() -> useCase.saveSettings(user, settings)).hasMessage("Storage unavailable");
        when(jobs.findById(id)).thenReturn(Optional.of(job(id, JobStatus.DRAFT)));
        assertThatThrownBy(() -> useCase.saveJob(user, id)).isInstanceOf(ResourceNotFoundException.class);
        verify(workspace, never()).saveJob(any(), any());
    }
}
