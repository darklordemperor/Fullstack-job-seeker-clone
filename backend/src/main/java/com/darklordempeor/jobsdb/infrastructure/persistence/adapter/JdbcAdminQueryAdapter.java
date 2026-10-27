package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.application.model.HiringModels.*;
import com.darklordempeor.jobsdb.application.port.AdminQueryPort;
import static com.darklordempeor.jobsdb.infrastructure.persistence.adapter.ApplicationRows.APPLICATION_SELECT;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Repository
@Transactional
public class JdbcAdminQueryAdapter implements AdminQueryPort {
    private final JdbcTemplate jdbc;
    public JdbcAdminQueryAdapter(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Page<UserView> users(int page, int size) {
        long total = jdbc.queryForObject("select count(*) from users", Long.class);
        return Page.of(jdbc.query("select id, email, role, banned, created_at from users order by created_at desc, id limit ? offset ?", (rs,n) ->
            new UserView(rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("role"), rs.getBoolean("banned"), rs.getTimestamp("created_at").toInstant()), size, (long)page*size), total, page, size);
    }
    public Page<ApplicationView> allApplications(int page, int size) {
        long total = jdbc.queryForObject("select count(*) from applications", Long.class);
        return Page.of(jdbc.query(APPLICATION_SELECT + " order by a.applied_at desc, a.id limit ? offset ?", ApplicationRows::applicationRow, size, (long)page*size), total, page, size);
    }
}
