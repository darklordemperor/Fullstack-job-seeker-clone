package com.darklordempeor.jobsdb.application.usecase.interview;

import com.darklordempeor.jobsdb.application.model.InterviewModels.*;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.application.port.InterviewPort;
import com.darklordempeor.jobsdb.domain.model.*;
import com.darklordempeor.jobsdb.domain.exception.*;
import com.darklordempeor.jobsdb.domain.service.InterviewRules;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;
import com.darklordempeor.jobsdb.domain.model.Notification.Kind;
import com.darklordempeor.jobsdb.application.usecase.notification.NotificationPublisher;

@Service
@Transactional
public class InterviewUseCase {
    private final InterviewPort interviews;
    private final NotificationPublisher notifications;
    public InterviewUseCase(InterviewPort interviews, NotificationPublisher notifications) { this.interviews = interviews; this.notifications=notifications; }
    @Transactional(readOnly=true, isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Page<View> list(UUID user, boolean employer, boolean upcoming, int page, int size) {
        return interviews.list(user, employer, upcoming, Math.max(0, page), Math.max(1, Math.min(50, size)));
    }
    public View propose(UUID employer, UUID application, Proposal proposal) {
        var context = interviews.lockApplication(application);
        owner(employer, context.employerId()); active(context);
        if (interviews.hasActive(application)) throw new ConflictException("An active invitation already exists; reschedule it instead");
        return persist(null, context, proposal);
    }
    public View reschedule(UUID employer, UUID id, int version, Proposal proposal) {
        var current = locked(id); owner(employer, current.employerId()); InterviewRules.editable(current, version);
        var context = interviews.lockApplication(current.applicationId()); active(context);
        return persist(current, context, proposal);
    }
    private View persist(Interview current, Context context, Proposal proposal) {
        Instant now = Instant.now();
        var slots = proposal.slots().stream().map(s -> new Interview.Slot(UUID.randomUUID(), s.startsAt(), s.endsAt())).toList();
        InterviewRules.proposal(proposal.mode(), proposal.location(), proposal.timezone(), slots, now);
        var value = new Interview(current == null ? UUID.randomUUID() : current.id(), context.applicationId(), context.employerId(), context.candidateId(),
            Interview.Status.PROPOSED, proposal.mode(), proposal.location().trim(), proposal.timezone(), slots, null,
            current == null ? 0 : current.version() + 1, current == null ? now : current.createdAt(), now);
        interviews.save(value, current == null);
        notifications.interview(value,current == null ? Kind.INTERVIEW_PROPOSED : Kind.INTERVIEW_RESCHEDULED,value.candidateId());
        return interviews.view(value.id());
    }
    public View accept(UUID candidate, UUID id, int version, UUID slotId) {
        var current = locked(id); owner(candidate, current.candidateId()); InterviewRules.editable(current, version);
        active(interviews.lockApplication(current.applicationId()));
        var slot = InterviewRules.accepting(current, slotId, Instant.now());
        // Ordered participant row locks serialize competing acceptances even across applications.
        interviews.lockParticipants(current.employerId(), current.candidateId());
        if (interviews.overlaps(current.employerId(), current.candidateId(), id, slot)) throw new ConflictException("This time conflicts with a confirmed interview; choose another slot or request new times");
        return change(current, Interview.Status.CONFIRMED, slotId, current.employerId());
    }
    public View decline(UUID candidate, UUID id, int version) {
        var current = locked(id); owner(candidate, current.candidateId()); InterviewRules.editable(current, version);
        if (current.status() != Interview.Status.PROPOSED) throw new ConflictException("Only proposed invitations can be declined");
        return change(current, Interview.Status.DECLINED, null, current.employerId());
    }
    public View cancel(UUID user, boolean employer, UUID id, int version) {
        var current = locked(id); owner(user, employer ? current.employerId() : current.candidateId());
        InterviewRules.editable(current, version);
        return change(current, Interview.Status.CANCELLED, null, employer ? current.candidateId() : current.employerId());
    }
    @Transactional(readOnly=true, isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public View detail(UUID user, boolean employer, UUID id) {
        var current = interviews.find(id); owner(user, employer ? current.employerId() : current.candidateId());
        return interviews.view(id);
    }
    public View finish(UUID employer, UUID id, int version, Interview.Status outcome) {
        var current = locked(id); owner(employer, current.employerId()); InterviewRules.editable(current, version);
        InterviewRules.finishing(current, outcome, Instant.now());
        return change(current, outcome, current.selectedSlotId(), current.candidateId());
    }
    @Transactional(readOnly=true, isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Page<Revision> history(UUID user, boolean employer, UUID id, int page, int size) {
        var current = interviews.find(id); owner(user, employer ? current.employerId() : current.candidateId());
        return interviews.history(id, Math.max(0,page), Math.max(1,Math.min(50,size)));
    }
    private Interview locked(UUID id) {
        var first = interviews.find(id);
        interviews.lockApplication(first.applicationId());
        return interviews.find(id);
    }
    private View change(Interview current, Interview.Status status, UUID slot, UUID recipient) {
        var updated = new Interview(current.id(), current.applicationId(), current.employerId(), current.candidateId(), status,
            current.mode(), current.location(), current.timezone(), current.slots(), slot, current.version()+1, current.createdAt(), Instant.now());
        interviews.save(updated, false);
        notifications.interview(updated,Kind.valueOf("INTERVIEW_"+status.name()),recipient);
        return interviews.view(current.id());
    }
    private void owner(UUID actual, UUID expected) { if (!actual.equals(expected)) throw new ForbiddenException("This interview belongs to another user"); }
    private void active(Context context) {
        if (context.status() != ApplicationStatus.SUBMITTED && context.status() != ApplicationStatus.REVIEWING) throw new ConflictException("Interviews require an application under review");
    }
}
