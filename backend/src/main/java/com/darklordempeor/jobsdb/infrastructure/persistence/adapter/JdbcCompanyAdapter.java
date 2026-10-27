package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.application.model.HiringModels.*;
import com.darklordempeor.jobsdb.application.port.CompanyPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Repository
@Transactional
public class JdbcCompanyAdapter implements CompanyPort {
    private final JdbcTemplate jdbc;
    public JdbcCompanyAdapter(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Company company(UUID userId) {
        return jdbc.query("select * from employer_profiles where user_id = ?", (rs, n) ->
            new Company(userId, rs.getString("company_name"), rs.getString("website"), rs.getString("description"), rs.getString("location")), userId)
            .stream().findFirst().orElse(new Company(userId, "", "", "", ""));
    }
    public Company saveCompany(Company value) {
        jdbc.update("""
            insert into employer_profiles(user_id, company_name, website, description, location) values (?, ?, ?, ?, ?)
            on conflict(user_id) do update set company_name=excluded.company_name, website=excluded.website,
            description=excluded.description, location=excluded.location, updated_at=now()
            """, value.userId(), value.companyName(), value.website(), value.description(), value.location());
        return company(value.userId());
    }
}
