package com.darklordempeor.jobsdb.application.port;

import com.darklordempeor.jobsdb.domain.model.Resume;
import java.util.List;
import java.util.UUID;

public interface ResumePort {
    List<Resume.Version> list(UUID owner);
    Resume.Version create(UUID owner, String fileName, byte[] bytes);
    void select(UUID owner, UUID version);
    void clear(UUID owner);
    void delete(UUID owner, UUID version);
    Resume.Download download(UUID owner, UUID version);
    Resume.Download applicationDownload(UUID actor, UUID application, boolean employer);
    void attachCurrent(UUID owner, UUID application);
}
