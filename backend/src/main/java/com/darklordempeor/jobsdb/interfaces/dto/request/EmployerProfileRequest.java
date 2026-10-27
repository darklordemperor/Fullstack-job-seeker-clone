package com.darklordempeor.jobsdb.interfaces.dto.request;

public record EmployerProfileRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=180) String companyName,
        @jakarta.validation.constraints.Pattern(regexp="^$|https?://[^\\s]+", message="must be an HTTP or HTTPS URL") String website,
        @jakarta.validation.constraints.Size(max=10000) String description, @jakarta.validation.constraints.Size(max=180) String location) {
}
