package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.application.port.ResumePort;
import com.darklordempeor.jobsdb.domain.exception.ConflictException;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import com.darklordempeor.jobsdb.domain.model.Resume;
import com.darklordempeor.jobsdb.domain.service.ResumeRules;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional
public class JdbcResumeAdapter implements ResumePort {
    private final JdbcTemplate jdbc;
    public JdbcResumeAdapter(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public List<Resume.Version> list(UUID owner) {
        return jdbc.query("""
            select r.id, r.file_name, r.size_bytes, r.created_at, r.is_current,
                   exists(select 1 from application_resumes a where a.resume_id=r.id) as attached
            from resume_versions r where r.user_id=? order by r.created_at desc, r.id
            """, (rs,n) -> new Resume.Version(rs.getObject("id", UUID.class), rs.getString("file_name"),
                rs.getInt("size_bytes"), rs.getTimestamp("created_at").toInstant(), rs.getBoolean("is_current"), rs.getBoolean("attached")), owner);
    }
    // Serialize upload, selection, deletion and application capture for one candidate.
    private void lock(UUID owner) {
        if (jdbc.queryForList("select id from users where id=? for no key update", UUID.class, owner).isEmpty())
            throw new ResourceNotFoundException("Candidate not found");
    }
    private void requireOwned(UUID owner, UUID id) {
        if (!Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from resume_versions where user_id=? and id=?)", Boolean.class, owner, id)))
            throw new ResourceNotFoundException("Resume not found");
    }
    public Resume.Version create(UUID owner, String name, byte[] bytes) {
        lock(owner);
        if (jdbc.queryForObject("select count(*) from resume_versions where user_id=?", Integer.class, owner) >= ResumeRules.MAX_VERSIONS)
            throw new ConflictException("You can keep up to 10 resume versions. Delete an unused version first.");
        jdbc.update("update resume_versions set is_current=false where user_id=? and is_current", owner);
        return jdbc.queryForObject("""
            insert into resume_versions(user_id,file_name,size_bytes,content,is_current) values(?,?,?,?,true)
            returning id,file_name,size_bytes,created_at
            """, (rs,n) -> new Resume.Version(rs.getObject("id", UUID.class), rs.getString("file_name"),
                rs.getInt("size_bytes"), rs.getTimestamp("created_at").toInstant(), true, false), owner,name,bytes.length,bytes);
    }
    public void select(UUID owner, UUID id) {
        lock(owner); requireOwned(owner,id);
        jdbc.update("update resume_versions set is_current=false where user_id=? and is_current", owner);
        jdbc.update("update resume_versions set is_current=true where id=? and user_id=?", id,owner);
    }
    public void clear(UUID owner) {
        lock(owner); jdbc.update("update resume_versions set is_current=false where user_id=? and is_current", owner);
    }
    public void delete(UUID owner, UUID id) {
        lock(owner); requireOwned(owner,id);
        if (Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from application_resumes where resume_id=?)", Boolean.class,id)))
            throw new ConflictException("This resume is attached to a submitted application and must be retained");
        jdbc.update("delete from resume_versions where id=? and user_id=?", id,owner);
    }
    public void attachCurrent(UUID owner, UUID application) {
        lock(owner);
        jdbc.update("""
            insert into application_resumes(application_id,resume_id)
            select a.id,r.id from applications a join resume_versions r on r.user_id=a.job_seeker_id and r.is_current
            where a.id=? and a.job_seeker_id=?
            """, application,owner);
    }
    public Resume.Download download(UUID owner, UUID id) {
        return jdbc.query("select file_name,content from resume_versions where id=? and user_id=?",
            (rs,n) -> new Resume.Download(rs.getString("file_name"),rs.getBytes("content")),id,owner).stream()
            .findFirst().orElseThrow(() -> new ResourceNotFoundException("Resume not found"));
    }
    public Resume.Download applicationDownload(UUID actor, UUID application, boolean employer) {
        String ownerColumn = employer ? "j.employer_id" : "a.job_seeker_id";
        return jdbc.query("""
            select r.file_name,r.content from application_resumes ar join resume_versions r on r.id=ar.resume_id
            join applications a on a.id=ar.application_id join jobs j on j.id=a.job_id
            where a.id=? and
            """ + ownerColumn + "=?",
            (rs,n) -> new Resume.Download(rs.getString("file_name"),rs.getBytes("content")),application,actor).stream()
            .findFirst().orElseThrow(() -> new ResourceNotFoundException("Submitted resume not found"));
    }
}
