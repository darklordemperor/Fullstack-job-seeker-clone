package com.darklordempeor.jobsdb.application.model;

public record JobCommand(
        String title,
        String description,
        String location,
        Integer salaryMin,
        Integer salaryMax,
        String salaryCurrency) {}
