package com.darklordempeor.jobsdb.interfaces.dto.request;

import com.darklordempeor.jobsdb.domain.model.JobStatus;
import jakarta.validation.constraints.NotNull;

public record JobStatusRequest(@NotNull JobStatus status) {
}
