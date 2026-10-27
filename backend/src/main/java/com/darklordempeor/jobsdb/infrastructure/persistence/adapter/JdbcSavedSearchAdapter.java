package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;
import com.darklordempeor.jobsdb.application.model.SavedSearchCommand;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.application.port.SavedSearchPort;
import com.darklordempeor.jobsdb.domain.exception.*;
import com.darklordempeor.jobsdb.domain.model.*;
import java.sql.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcSavedSearchAdapter implements SavedSearchPort {
    private static final String FIELDS="id,name,query,location,salary_min,salary_max,currency,enabled,created_at";
    // Shared matching rules; user values never become SQL fragments.
    private static final String MATCH="""
        (c.query='' or position(lower(c.query) in lower(j.title))>0 or position(lower(c.query) in lower(j.description))>0)
        and (c.location='' or position(lower(c.location) in lower(coalesce(j.location,'')))>0)
        and (c.salary_min is null or j.salary_max>=c.salary_min)
        and (c.salary_max is null or j.salary_min<=c.salary_max)
        and (c.currency='' or upper(j.salary_currency)=c.currency)
        """;
    private final JdbcTemplate jdbc;
    public JdbcSavedSearchAdapter(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public List<SavedSearch> list(UUID user) {
        return jdbc.query("select "+FIELDS+" from saved_searches where user_id=? order by created_at desc,id limit 20",(rs,n)->row(rs),user);
    }
    public SavedSearch create(UUID user, SavedSearchCommand c) {
        // Serialize per-account creation so concurrent requests cannot exceed the limit.
        jdbc.queryForObject("select id from users where id=? for update",UUID.class,user);
        if (jdbc.queryForObject("select count(*) from saved_searches where user_id=?",Long.class,user)>=20)
            throw new ConflictException("You can save up to 20 searches. Delete one before adding another.");
        return jdbc.queryForObject("insert into saved_searches(id,user_id,name,query,location,salary_min,salary_max,currency) values (?,?,?,?,?,?,?,?) returning "+FIELDS,
            (rs,n)->row(rs),UUID.randomUUID(),user,c.name(),c.query(),c.location(),c.salaryMin(),c.salaryMax(),c.currency());
    }
    public SavedSearch setEnabled(UUID user, UUID id, boolean enabled) {
        return jdbc.query("update saved_searches set enabled=? where id=? and user_id=? returning "+FIELDS,(rs,n)->row(rs),enabled,id,user)
            .stream().findFirst().orElseThrow(()->new ResourceNotFoundException("Saved search not found"));
    }
    public void delete(UUID user, UUID id) {
        if (jdbc.update("delete from saved_searches where id=? and user_id=?",id,user)==0)
            throw new ResourceNotFoundException("Saved search not found");
    }
    public Page<Job> matches(UUID user, UUID id, int page, int size) {
        if (!Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from saved_searches where id=? and user_id=?)",Boolean.class,id,user)))
            throw new ResourceNotFoundException("Saved search not found");
        String from=" from jobs j cross join saved_searches c where c.id=? and c.user_id=? and j.status='ACTIVE' and "+MATCH;
        long total=jdbc.queryForObject("select count(*)"+from,Long.class,id,user);
        var jobs=jdbc.query("select j.id,j.employer_id,j.title,j.description,j.location,j.salary_min,j.salary_max,j.salary_currency,j.created_at"+from+" order by j.created_at desc,j.id limit ? offset ?",(rs,n)->new Job(
            rs.getObject("id",UUID.class),rs.getObject("employer_id",UUID.class),rs.getString("title"),rs.getString("description"),rs.getString("location"),
            rs.getObject("salary_min",Integer.class),rs.getObject("salary_max",Integer.class),rs.getString("salary_currency"),JobStatus.ACTIVE,rs.getTimestamp("created_at").toInstant()),id,user,size,(long)page*size);
        return Page.of(jobs,total,page,size);
    }
    public void publishFirst(Job job) {
        if (jdbc.update("insert into job_publications(job_id) values (?) on conflict (job_id) do nothing",job.id())==0) return;
        // Set-based delivery avoids an N+1 lookup for every saved search.
        jdbc.update("""
            insert into notifications(id,recipient_id,event_key,kind,title,message,href)
            select gen_random_uuid(),recipients.user_id,?,'JOB_MATCH','New matching job',?,?
            from (select distinct c.user_id from saved_searches c join users u on u.id=c.user_id
            cross join (select ?::text title,?::text description,?::text location,?::integer salary_min,?::integer salary_max,?::text salary_currency) j
            where c.enabled and not u.banned and u.role='ROLE_JOB_SEEKER' and
            """+MATCH+" ) recipients on conflict (recipient_id,event_key) do nothing",
            "job:"+job.id()+":published","A new job matches your saved searches: "+job.title()+".","/jobs/"+job.id(),
            job.title(),job.description(),job.location(),job.salaryMin(),job.salaryMax(),job.salaryCurrency());
    }
    private SavedSearch row(ResultSet rs) throws SQLException {
        return new SavedSearch(rs.getObject("id",UUID.class),rs.getString("name"),rs.getString("query"),rs.getString("location"),
            rs.getObject("salary_min",Integer.class),rs.getObject("salary_max",Integer.class),rs.getString("currency"),rs.getBoolean("enabled"),rs.getTimestamp("created_at").toInstant());
    }
}
