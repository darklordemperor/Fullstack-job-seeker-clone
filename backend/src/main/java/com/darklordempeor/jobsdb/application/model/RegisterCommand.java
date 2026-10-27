package com.darklordempeor.jobsdb.application.model;

public record RegisterCommand(
        String email,
        String password,
        String displayName) {}
