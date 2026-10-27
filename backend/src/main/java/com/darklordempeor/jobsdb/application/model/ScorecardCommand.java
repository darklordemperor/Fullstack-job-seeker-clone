package com.darklordempeor.jobsdb.application.model;
import com.darklordempeor.jobsdb.domain.model.Scorecard;
public record ScorecardCommand(int expectedVersion, Scorecard.Feedback feedback) {}
