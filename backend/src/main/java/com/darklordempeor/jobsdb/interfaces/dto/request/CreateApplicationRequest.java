package com.darklordempeor.jobsdb.interfaces.dto.request;

import java.util.UUID;
import jakarta.validation.constraints.NotNull;

public record CreateApplicationRequest(@NotNull UUID jobId) {
}
