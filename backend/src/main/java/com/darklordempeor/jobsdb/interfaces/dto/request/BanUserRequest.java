package com.darklordempeor.jobsdb.interfaces.dto.request;

import jakarta.validation.constraints.NotBlank;

public record BanUserRequest(@NotBlank String reason) {
}
