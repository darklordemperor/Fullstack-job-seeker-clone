package com.darklordempeor.jobsdb.application.usecase.jobseeker;

import com.darklordempeor.jobsdb.application.port.ResumePort;
import com.darklordempeor.jobsdb.domain.model.Resume;
import com.darklordempeor.jobsdb.domain.service.ResumeRules;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ResumeUseCase {
    private final ResumePort resumes;
    public ResumeUseCase(ResumePort resumes) { this.resumes = resumes; }
    @Transactional(readOnly = true)
    public List<Resume.Version> list(UUID owner) { return resumes.list(owner); }
    public Resume.Version upload(UUID owner, String name, String type, byte[] bytes) {
        return resumes.create(owner, ResumeRules.validate(name, type, bytes), bytes);
    }
    public void select(UUID owner, UUID version) { resumes.select(owner, version); }
    public void clear(UUID owner) { resumes.clear(owner); }
    public void delete(UUID owner, UUID version) { resumes.delete(owner, version); }
    @Transactional(readOnly = true)
    public Resume.Download download(UUID owner, UUID version) { return resumes.download(owner, version); }
    @Transactional(readOnly = true)
    public Resume.Download applicationDownload(UUID actor, UUID application, boolean employer) {
        return resumes.applicationDownload(actor, application, employer);
    }
}
