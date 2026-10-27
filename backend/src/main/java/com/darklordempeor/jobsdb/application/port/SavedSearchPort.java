package com.darklordempeor.jobsdb.application.port;
import com.darklordempeor.jobsdb.application.model.SavedSearchCommand;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.domain.model.*;
import java.util.List;
import java.util.UUID;
public interface SavedSearchPort {
    List<SavedSearch> list(UUID user);
    SavedSearch create(UUID user, SavedSearchCommand command);
    SavedSearch setEnabled(UUID user, UUID id, boolean enabled);
    void delete(UUID user, UUID id);
    Page<Job> matches(UUID user, UUID id, int page, int size);
    void publishFirst(Job job);
}
