package com.darklordempeor.jobsdb.interfaces.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LicenseRequest(
		@NotBlank String name,
		String issuer,
		Integer issuedYear,
		Integer expiresYear,
		String description) {
}
