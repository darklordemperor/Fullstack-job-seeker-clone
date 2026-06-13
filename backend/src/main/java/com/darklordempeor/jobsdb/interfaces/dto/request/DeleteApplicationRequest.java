package com.darklordempeor.jobsdb.interfaces.dto.request;

import jakarta.validation.constraints.NotBlank;

public record DeleteApplicationRequest(@NotBlank String reason) {
}
