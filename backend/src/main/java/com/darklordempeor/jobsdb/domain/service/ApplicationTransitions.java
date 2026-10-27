package com.darklordempeor.jobsdb.domain.service;

import com.darklordempeor.jobsdb.domain.exception.ConflictException;
import com.darklordempeor.jobsdb.domain.model.ApplicationStatus;

public final class ApplicationTransitions {
    private ApplicationTransitions() {}
    public static void requireAllowed(ApplicationStatus current, ApplicationStatus next) {
        boolean allowed = current == ApplicationStatus.SUBMITTED && (next == ApplicationStatus.REVIEWING || next == ApplicationStatus.REJECTED)
                || current == ApplicationStatus.REVIEWING && (next == ApplicationStatus.HIRED || next == ApplicationStatus.REJECTED);
        if (!allowed) throw new ConflictException("Cannot move an application from " + current + " to " + next);
    }
}
