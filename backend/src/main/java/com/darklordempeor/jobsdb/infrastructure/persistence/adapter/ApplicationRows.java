package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;
import com.darklordempeor.jobsdb.application.model.HiringModels.ApplicationView;
import com.darklordempeor.jobsdb.domain.model.ApplicationStatus;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;

final class ApplicationRows {
    private ApplicationRows() {}
    static final String APPLICATION_SELECT = """
        select a.*, j.title as job_title, coalesce(ep.company_name, '') as company_name,
               coalesce(s.profile->>'fullName', p.full_name, '') as applicant_name,
               coalesce(s.applicant_email, u.email) as applicant_email
        from applications a join jobs j on j.id = a.job_id join users u on u.id = a.job_seeker_id
        left join employer_profiles ep on ep.user_id = j.employer_id
        left join job_seeker_profiles p on p.user_id = a.job_seeker_id
        left join application_snapshots s on s.application_id = a.id
        """;
    static ApplicationView applicationRow(ResultSet rs, int row) throws SQLException {
        return new ApplicationView(rs.getObject("id", UUID.class), rs.getObject("job_id", UUID.class), rs.getObject("job_seeker_id", UUID.class),
            ApplicationStatus.valueOf(rs.getString("status")), rs.getTimestamp("applied_at").toInstant(), rs.getString("job_title"),
            rs.getString("company_name"), rs.getString("applicant_name"), rs.getString("applicant_email"));
    }
}
