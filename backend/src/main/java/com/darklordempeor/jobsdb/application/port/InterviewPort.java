package com.darklordempeor.jobsdb.application.port;
import com.darklordempeor.jobsdb.application.model.InterviewModels.*;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.domain.model.Interview;
import java.util.UUID;

public interface InterviewPort {
    Context lockApplication(UUID id);
    void lockParticipants(UUID employer, UUID candidate);
    boolean hasActive(UUID application);
    boolean overlaps(UUID employer, UUID candidate, UUID excluded, Interview.Slot slot);
    Interview find(UUID id);
    void save(Interview interview, boolean create);
    View view(UUID id);
    Page<Revision> history(UUID id, int page, int size);
    Page<View> list(UUID user, boolean employer, boolean upcoming, int page, int size);
}
