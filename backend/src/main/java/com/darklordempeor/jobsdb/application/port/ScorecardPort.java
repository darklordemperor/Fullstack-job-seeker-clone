package com.darklordempeor.jobsdb.application.port;
import com.darklordempeor.jobsdb.domain.model.Scorecard;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import java.util.UUID;
public interface ScorecardPort {
    Scorecard find(UUID interviewId);
    void save(Scorecard value);
    Page<Scorecard> history(UUID interviewId, int page, int size);
}
