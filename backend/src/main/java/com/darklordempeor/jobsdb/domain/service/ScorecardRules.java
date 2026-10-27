package com.darklordempeor.jobsdb.domain.service;

import com.darklordempeor.jobsdb.domain.model.Interview;
import com.darklordempeor.jobsdb.domain.model.Scorecard;
import com.darklordempeor.jobsdb.domain.exception.ConflictException;
import com.darklordempeor.jobsdb.domain.exception.DomainException;

public final class ScorecardRules {
    private ScorecardRules() {}
    public static void editable(Scorecard current, int expectedVersion, Interview.Status interview, boolean finalize) {
        if (expectedVersion < 0) throw new DomainException("Expected version must be nonnegative");
        if ((current == null ? 0 : current.version()) != expectedVersion)
            throw new ConflictException("Scorecard changed; reload before saving");
        if (current != null && current.status() == Scorecard.Status.FINALIZED)
            throw new ConflictException("Finalized scorecards are read-only");
        if (interview != Interview.Status.PROPOSED && interview != Interview.Status.CONFIRMED && interview != Interview.Status.COMPLETED)
            throw new ConflictException("This interview is closed without completion; its scorecard is read-only");
        if (finalize && interview != Interview.Status.COMPLETED)
            throw new ConflictException("Complete the interview before finalizing its scorecard");
    }
    public static Scorecard.Feedback normalize(Scorecard.Feedback feedback, boolean finalize) {
        if (feedback == null) throw new DomainException("Feedback is required");
        rating(feedback.technicalSkills()); rating(feedback.communication()); rating(feedback.problemSolving());
        String strengths=text(feedback.strengths()), concerns=text(feedback.concerns());
        if (finalize && (feedback.technicalSkills()==null || feedback.communication()==null || feedback.problemSolving()==null
                || feedback.recommendation()==null || (strengths.isEmpty() && concerns.isEmpty())))
            throw new DomainException("Finalization requires all three ratings, a recommendation and at least one strengths or concerns note");
        return new Scorecard.Feedback(feedback.technicalSkills(),feedback.communication(),feedback.problemSolving(),strengths,concerns,feedback.recommendation());
    }
    private static void rating(Integer value) {
        if (value != null && (value < 1 || value > 5)) throw new DomainException("Ratings must be between 1 and 5");
    }
    private static String text(String value) {
        String normalized=value==null ? "" : value.strip();
        if (normalized.length()>2000) throw new DomainException("Each feedback note must be 2000 characters or fewer");
        return normalized;
    }
}
