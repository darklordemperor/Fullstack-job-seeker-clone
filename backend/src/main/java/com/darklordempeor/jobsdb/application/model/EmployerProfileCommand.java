package com.darklordempeor.jobsdb.application.model;

public record EmployerProfileCommand(
        String companyName,
        String website,
        String description,
        String location) {}
