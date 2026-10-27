package com.darklordempeor.jobsdb.application.model;
public record SavedSearchCommand(String name, String query, String location, Integer salaryMin,
        Integer salaryMax, String currency) {}
