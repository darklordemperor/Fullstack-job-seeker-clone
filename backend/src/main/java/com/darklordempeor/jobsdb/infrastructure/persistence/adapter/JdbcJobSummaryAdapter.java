package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.application.port.JobSummaryPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class JdbcJobSummaryAdapter implements JobSummaryPort {
    private final NamedParameterJdbcTemplate jdbc;
    public JdbcJobSummaryAdapter(JdbcTemplate jdbc) { this.jdbc = new NamedParameterJdbcTemplate(jdbc); }
    public Map<UUID, Summary> summaries(List<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        Map<UUID, Summary> results = new HashMap<>();
        jdbc.query("""
            select j.id, coalesce(p.company_name, '') as company_name, count(a.id) as applicants
            from jobs j left join employer_profiles p on p.user_id=j.employer_id
            left join applications a on a.job_id=j.id where j.id in (:ids)
            group by j.id, p.company_name
            """, Map.of("ids", ids), rs -> {
                results.put(rs.getObject("id", UUID.class), new Summary(rs.getString("company_name"), rs.getLong("applicants")));
            });
        return results;
    }
}
