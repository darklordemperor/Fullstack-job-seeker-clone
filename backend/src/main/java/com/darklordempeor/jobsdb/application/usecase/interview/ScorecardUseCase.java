package com.darklordempeor.jobsdb.application.usecase.interview;

import com.darklordempeor.jobsdb.application.model.ScorecardCommand;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.application.port.InterviewPort;
import com.darklordempeor.jobsdb.application.port.ScorecardPort;
import com.darklordempeor.jobsdb.domain.model.Interview;
import com.darklordempeor.jobsdb.domain.model.Scorecard;
import com.darklordempeor.jobsdb.domain.service.ScorecardRules;
import com.darklordempeor.jobsdb.domain.exception.ForbiddenException;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ScorecardUseCase {
    private final InterviewPort interviews;
    private final ScorecardPort scorecards;
    public ScorecardUseCase(InterviewPort interviews, ScorecardPort scorecards) { this.interviews=interviews; this.scorecards=scorecards; }
    private Interview owned(UUID employer,UUID id) {
        var interview=interviews.find(id);
        if (!employer.equals(interview.employerId())) throw new ForbiddenException("This interview belongs to another employer");
        return interview;
    }
    @Transactional(readOnly=true)
    public Scorecard get(UUID employer,UUID id) { owned(employer,id); return scorecards.find(id); }
    public Scorecard save(UUID employer,UUID id,ScorecardCommand command,boolean finalize) {
        var first=owned(employer,id);
        // Interview lifecycle writes use this same lock, preventing finalize/cancel races.
        interviews.lockApplication(first.applicationId());
        var interview=owned(employer,id);
        var current=scorecards.find(id);
        ScorecardRules.editable(current,command.expectedVersion(),interview.status(),finalize);
        var feedback=ScorecardRules.normalize(command.feedback(),finalize);
        // PostgreSQL timestamptz stores microseconds; keep current and JSON history identical.
        var now=Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        var updated=new Scorecard(id,command.expectedVersion()+1,finalize ? Scorecard.Status.FINALIZED : Scorecard.Status.DRAFT,
            feedback,now,finalize ? now : null);
        scorecards.save(updated);
        return updated;
    }
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Page<Scorecard> history(UUID employer,UUID id,int page,int size) {
        owned(employer,id); return scorecards.history(id,Math.max(0,page),Math.max(1,Math.min(50,size)));
    }
}
