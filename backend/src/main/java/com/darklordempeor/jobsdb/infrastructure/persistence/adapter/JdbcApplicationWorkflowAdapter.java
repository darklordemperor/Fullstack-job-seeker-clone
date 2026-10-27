package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.application.model.HiringModels.*;
import com.darklordempeor.jobsdb.application.port.ApplicationWorkflowPort;
import static com.darklordempeor.jobsdb.infrastructure.persistence.adapter.ApplicationRows.APPLICATION_SELECT;
import com.darklordempeor.jobsdb.application.port.JobSeekerProfilePort;
import com.darklordempeor.jobsdb.domain.exception.ConflictException;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import com.darklordempeor.jobsdb.domain.model.ApplicationStatus;
import com.darklordempeor.jobsdb.domain.model.JobApplication;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;

@Repository
@Transactional
public class JdbcApplicationWorkflowAdapter implements ApplicationWorkflowPort {
    private final JdbcTemplate jdbc;
    private final JobSeekerProfilePort profiles;
    private final ObjectMapper json;
    public JdbcApplicationWorkflowAdapter(JdbcTemplate jdbc, JobSeekerProfilePort profiles, ObjectMapper json) { this.jdbc = jdbc; this.profiles = profiles; this.json = json; }
    public EmployerStats stats(UUID employerId) {
        return jdbc.queryForObject("""
            select (select count(*) from jobs where employer_id=? and status='ACTIVE') as open_jobs,
                   (select count(*) from jobs where employer_id=?) as total_jobs,
                   count(*) as applicants, count(*) filter(where a.status='REVIEWING') as reviewing,
                   count(*) filter(where a.status='HIRED') as hired
            from applications a join jobs j on j.id=a.job_id where j.employer_id=?
            """, (rs, n) -> new EmployerStats(rs.getLong("open_jobs"), rs.getLong("total_jobs"), rs.getLong("applicants"),
                rs.getLong("reviewing"), rs.getLong("hired")), employerId, employerId, employerId);
    }
    public boolean hasApplication(UUID userId, UUID jobId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from applications where job_seeker_id=? and job_id=?)", Boolean.class, userId, jobId));
    }
    public void captureSubmission(JobApplication application) {
        Profile profile = profiles.findOrCreate(application.jobSeekerId());
        jdbc.update("""
            insert into application_snapshots(application_id, applicant_email, profile)
            select ?, email, cast(? as jsonb) from users where id=?
            """, application.id(), json.writeValueAsString(profile), application.jobSeekerId());
        jdbc.update("insert into application_events(application_id, actor_user_id, to_status) values (?, ?, 'SUBMITTED')",
                application.id(), application.jobSeekerId());
    }
    public Page<ApplicationView> applicants(UUID jobId, ApplicationStatus status, int page, int size) {
        String filter = status == null ? "" : status.name();
        long total = jdbc.queryForObject("select count(*) from applications where job_id=? and (?='' or status=?)", Long.class, jobId, filter, filter);
        var content = jdbc.query(APPLICATION_SELECT + " where a.job_id=? and (?='' or a.status=?) order by a.applied_at desc, a.id limit ? offset ?",
                ApplicationRows::applicationRow, jobId, filter, filter, size, (long) page * size);
        return Page.of(content, total, page, size);
    }
    public Page<ApplicationView> mine(UUID userId, int page, int size) {
        long total = jdbc.queryForObject("select count(*) from applications where job_seeker_id=?", Long.class, userId);
        return Page.of(jdbc.query(APPLICATION_SELECT + " where a.job_seeker_id=? order by a.applied_at desc, a.id limit ? offset ?",
                ApplicationRows::applicationRow, userId, size, (long) page * size), total, page, size);
    }
    public List<ApplicationView> mine(UUID userId) {
        return jdbc.query(APPLICATION_SELECT + " where a.job_seeker_id=? order by a.applied_at desc, a.id", ApplicationRows::applicationRow, userId);
    }
    public Detail detail(UUID id, boolean employer) {
        var application = jdbc.query(APPLICATION_SELECT + " where a.id=?", ApplicationRows::applicationRow, id).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        var snapshot = jdbc.query("select * from application_snapshots where application_id=?", (rs, n) ->
                new Submission(json.readValue(rs.getString("profile"), Profile.class), rs.getString("applicant_email"),
                    rs.getTimestamp("captured_at").toInstant()), id).stream().findFirst().orElse(null);
        var events = jdbc.query("select * from application_events where application_id=? order by created_at, id", (rs, n) ->
                new Event(rs.getObject("id", UUID.class), rs.getString("from_status") == null ? null : ApplicationStatus.valueOf(rs.getString("from_status")),
                    ApplicationStatus.valueOf(rs.getString("to_status")), rs.getTimestamp("created_at").toInstant(),
                    employer ? rs.getObject("actor_user_id", UUID.class) : null, employer ? rs.getString("internal_note") : null), id);
        var resume = jdbc.query("""
            select r.id,r.file_name,r.size_bytes,r.created_at from application_resumes ar
            join resume_versions r on r.id=ar.resume_id where ar.application_id=?
            """, (rs,n) -> new com.darklordempeor.jobsdb.domain.model.Resume.Metadata(rs.getObject("id",UUID.class),
                rs.getString("file_name"),rs.getInt("size_bytes"),rs.getTimestamp("created_at").toInstant()),id)
            .stream().findFirst().orElse(null);
        return new Detail(application, snapshot, events, resume);
    }
    public ApplicationView transition(UUID id, UUID actor, ApplicationStatus expected, ApplicationStatus next, String note) {
        if (jdbc.update("update applications set status=? where id=? and status=?", next.name(), id, expected.name()) != 1)
            throw new ConflictException("Application changed; reload before updating");
        jdbc.update("insert into application_events(application_id, actor_user_id, from_status, to_status, internal_note) values (?, ?, ?, ?, ?)",
                id, actor, expected.name(), next.name(), note);
        return detail(id, true).application();
    }
}
