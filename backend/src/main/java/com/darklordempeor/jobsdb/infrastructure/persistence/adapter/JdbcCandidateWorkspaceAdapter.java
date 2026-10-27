package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.application.model.HiringModels.*;
import com.darklordempeor.jobsdb.application.port.CandidateWorkspacePort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Repository
@Transactional
public class JdbcCandidateWorkspaceAdapter implements CandidateWorkspacePort {
    private final JdbcTemplate jdbc;
    public JdbcCandidateWorkspaceAdapter(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public JobState jobState(UUID userId, UUID jobId) {
        return jdbc.queryForObject("select exists(select 1 from applications where job_seeker_id=? and job_id=?), exists(select 1 from saved_jobs where user_id=? and job_id=?)",
            (rs,n) -> new JobState(rs.getBoolean(1), rs.getBoolean(2)), userId, jobId, userId, jobId);
    }
    public Settings settings(UUID userId) {
        return jdbc.query("select display_name, contact_email, discoverable, recommendations from job_seeker_settings where user_id=?", (rs, n) ->
            new Settings(rs.getString(1), rs.getString(2), rs.getBoolean(3), rs.getBoolean(4)), userId).stream().findFirst()
            .orElseGet(() -> new Settings("", jdbc.queryForObject("select email from users where id=?", String.class, userId), false, false));
    }
    public Settings saveSettings(UUID userId, Settings value) {
        jdbc.update("""
            insert into job_seeker_settings(user_id, display_name, contact_email, discoverable, recommendations) values (?, ?, ?, ?, ?)
            on conflict(user_id) do update set display_name=excluded.display_name, contact_email=excluded.contact_email,
            discoverable=excluded.discoverable, recommendations=excluded.recommendations, updated_at=now()
            """, userId, value.displayName(), value.contactEmail(), value.discoverable(), value.recommendations());
        return value;
    }
    public List<UUID> savedJobs(UUID userId) { return jdbc.queryForList("select job_id from saved_jobs where user_id=? order by saved_at desc", UUID.class, userId); }
    public Page<SavedJob> savedJobsPage(UUID userId, int page, int size) {
        long total = jdbc.queryForObject("select count(*) from saved_jobs where user_id=?", Long.class, userId);
        var content = jdbc.query("""
            select j.id, case when j.status='DRAFT' then 'Job unavailable' else j.title end as title,
                   case when j.status='DRAFT' then '' else coalesce(p.company_name, '') end as company_name,
                   case when j.status='DRAFT' then null else j.location end as location, j.status, s.saved_at
            from saved_jobs s join jobs j on j.id=s.job_id
            left join employer_profiles p on p.user_id=j.employer_id
            where s.user_id=? order by s.saved_at desc, s.job_id
            limit ? offset ?
            """, (rs, n) -> new SavedJob(rs.getObject("id", UUID.class), rs.getString("title"),
                rs.getString("company_name"), rs.getString("location"),
                com.darklordempeor.jobsdb.domain.model.JobStatus.valueOf(rs.getString("status")),
                rs.getTimestamp("saved_at").toInstant()), userId, size, (long) page * size);
        return Page.of(content, total, page, size);
    }
    public void saveJob(UUID userId, UUID jobId) { jdbc.update("insert into saved_jobs(user_id,job_id) values (?,?) on conflict do nothing", userId, jobId); }
    public void unsaveJob(UUID userId, UUID jobId) { jdbc.update("delete from saved_jobs where user_id=? and job_id=?", userId, jobId); }
}
