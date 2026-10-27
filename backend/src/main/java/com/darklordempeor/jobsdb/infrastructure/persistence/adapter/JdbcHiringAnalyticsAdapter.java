package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.application.model.AnalyticsModels.Totals;
import com.darklordempeor.jobsdb.application.port.HiringAnalyticsPort;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcHiringAnalyticsAdapter implements HiringAnalyticsPort {
    private final JdbcTemplate jdbc;
    public JdbcHiringAnalyticsAdapter(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public Totals summarize(UUID employer,UUID jobId,Instant from,Instant to,Instant asOf) {
        return jdbc.queryForObject("""
            with cohort as (
                select a.id,a.status,a.applied_at from applications a join jobs j on j.id=a.job_id
                where j.employer_id=? and (cast(? as uuid) is null or a.job_id=?)
                  and a.applied_at>=? and a.applied_at<? and a.applied_at<=?
            ), milestones as (
                select e.application_id,
                    bool_or(e.to_status='SUBMITTED' and e.from_status is null) as submitted,
                    bool_or(e.to_status='REVIEWING' or e.from_status='REVIEWING') as reviewed,
                    min(e.created_at) filter(where e.to_status='HIRED' and e.created_at>=c.applied_at) as hired_at
                from application_events e join cohort c on c.id=e.application_id
                where e.created_at<=? group by e.application_id
            )
            select count(*) as applications,
                count(*) filter(where m.submitted) as submission_history,
                count(*) filter(where m.reviewed) as reviewed,
                count(m.hired_at) as hired,
                count(*) filter(where c.status='SUBMITTED') as submitted_now,
                count(*) filter(where c.status='REVIEWING') as reviewing_now,
                count(*) filter(where c.status='HIRED') as hired_now,
                count(*) filter(where c.status='REJECTED') as rejected_now,
                count(*) filter(where c.status='HIRED' and m.hired_at is null) as missing_hire_time,
                cast(avg(extract(epoch from (m.hired_at-c.applied_at))/86400.0) as double precision) as average_days,
                percentile_cont(0.5) within group(order by extract(epoch from (m.hired_at-c.applied_at))/86400.0) as median_days
            from cohort c left join milestones m on m.application_id=c.id
            """,(rs,n)->new Totals(rs.getLong("applications"),rs.getLong("submission_history"),rs.getLong("reviewed"),rs.getLong("hired"),
                rs.getLong("submitted_now"),rs.getLong("reviewing_now"),rs.getLong("hired_now"),rs.getLong("rejected_now"),
                rs.getLong("missing_hire_time"),rs.getObject("average_days",Double.class),rs.getObject("median_days",Double.class)),
            employer,jobId,jobId,Timestamp.from(from),Timestamp.from(to),Timestamp.from(asOf),Timestamp.from(asOf));
    }
}
