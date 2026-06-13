package com.darklordempeor.jobsdb.interfaces.dto.request;

import jakarta.validation.constraints.NotBlank;

public record EducationRequest(@NotBlank String institution, String degree, String fieldOfStudy, Integer graduationYear) {
}
