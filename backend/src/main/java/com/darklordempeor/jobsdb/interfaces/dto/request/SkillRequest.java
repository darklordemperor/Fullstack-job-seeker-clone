package com.darklordempeor.jobsdb.interfaces.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SkillRequest(@NotBlank String name, Integer yearsOfExperience, String level) {
}
