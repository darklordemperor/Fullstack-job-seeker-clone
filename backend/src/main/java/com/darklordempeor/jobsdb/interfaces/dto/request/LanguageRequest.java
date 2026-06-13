package com.darklordempeor.jobsdb.interfaces.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LanguageRequest(@NotBlank String language, String proficiency) {
}
