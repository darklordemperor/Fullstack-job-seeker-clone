package com.darklordempeor.jobsdb.domain.service;

import com.darklordempeor.jobsdb.domain.exception.ConflictException;
import com.darklordempeor.jobsdb.domain.model.ApplicationStatus;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.assertj.core.api.Assertions.*;

class ApplicationTransitionsTest {
    @ParameterizedTest(name = "{0} -> {1}: allowed={2}")
    @CsvSource({
        "SUBMITTED,SUBMITTED,false", "SUBMITTED,REVIEWING,true", "SUBMITTED,REJECTED,true", "SUBMITTED,HIRED,false",
        "REVIEWING,SUBMITTED,false", "REVIEWING,REVIEWING,false", "REVIEWING,REJECTED,true", "REVIEWING,HIRED,true",
        "REJECTED,SUBMITTED,false", "REJECTED,REVIEWING,false", "REJECTED,REJECTED,false", "REJECTED,HIRED,false",
        "HIRED,SUBMITTED,false", "HIRED,REVIEWING,false", "HIRED,REJECTED,false", "HIRED,HIRED,false"
    })
    void enforcesEveryStatusPair(ApplicationStatus from, ApplicationStatus to, boolean allowed) {
        if (allowed) assertThatCode(() -> ApplicationTransitions.requireAllowed(from, to)).doesNotThrowAnyException();
        else assertThatThrownBy(() -> ApplicationTransitions.requireAllowed(from, to)).isInstanceOf(ConflictException.class);
    }
}
