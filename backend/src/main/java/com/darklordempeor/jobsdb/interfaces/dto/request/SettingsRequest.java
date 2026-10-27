package com.darklordempeor.jobsdb.interfaces.dto.request;

import jakarta.validation.constraints.*;

public record SettingsRequest(@NotBlank @Size(max=160) String displayName,
                              @NotBlank @Email @Size(max=320) String contactEmail,
                              boolean discoverable, boolean recommendations) {}
