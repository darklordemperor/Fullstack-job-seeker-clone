package com.darklordempeor.jobsdb.application.port;

import com.darklordempeor.jobsdb.application.model.HiringModels.*;
import java.util.UUID;

public interface AuditPort {
    void audit(UUID actorId, String action, String targetType, UUID targetId, String reason);
}
