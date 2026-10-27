package com.darklordempeor.jobsdb.application.model;

public record LoginCommand(
        String email,
        String password) {}
