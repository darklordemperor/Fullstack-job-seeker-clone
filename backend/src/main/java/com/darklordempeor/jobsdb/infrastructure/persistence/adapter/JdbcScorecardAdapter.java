package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.application.port.ScorecardPort;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.domain.model.Scorecard;
import com.darklordempeor.jobsdb.domain.exception.ConflictException;
import java.sql.Timestamp;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

@Repository
public class JdbcScorecardAdapter implements ScorecardPort {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public JdbcScorecardAdapter(JdbcTemplate jdbc,ObjectMapper json) { this.jdbc=jdbc; this.json=json; }
    public Scorecard find(UUID id) {
        return jdbc.query("""
            select interview_id,version,status,technical_skills,communication,problem_solving,strengths,concerns,
                   recommendation,updated_at,finalized_at from interview_scorecards where interview_id=?
            """,(rs,n)->new Scorecard(rs.getObject("interview_id",UUID.class),rs.getInt("version"),Scorecard.Status.valueOf(rs.getString("status")),
                new Scorecard.Feedback(rs.getObject("technical_skills",Integer.class),rs.getObject("communication",Integer.class),rs.getObject("problem_solving",Integer.class),
                    rs.getString("strengths"),rs.getString("concerns"),rs.getString("recommendation")==null ? null : Scorecard.Recommendation.valueOf(rs.getString("recommendation"))),
                rs.getTimestamp("updated_at").toInstant(),rs.getTimestamp("finalized_at")==null ? null : rs.getTimestamp("finalized_at").toInstant()),id)
            .stream().findFirst().orElse(null);
    }
    public void save(Scorecard value) {
        var f=value.feedback();
        int written=jdbc.update("""
            insert into interview_scorecards(interview_id,version,status,technical_skills,communication,problem_solving,strengths,concerns,recommendation,updated_at,finalized_at)
            values(?,?,?,?,?,?,?,?,?,?,?)
            on conflict(interview_id) do update set version=excluded.version,status=excluded.status,technical_skills=excluded.technical_skills,
              communication=excluded.communication,problem_solving=excluded.problem_solving,strengths=excluded.strengths,concerns=excluded.concerns,
              recommendation=excluded.recommendation,updated_at=excluded.updated_at,finalized_at=excluded.finalized_at
            where interview_scorecards.version=? and interview_scorecards.status='DRAFT'
            """,value.interviewId(),value.version(),value.status().name(),f.technicalSkills(),f.communication(),f.problemSolving(),f.strengths(),f.concerns(),
            f.recommendation()==null ? null : f.recommendation().name(),Timestamp.from(value.updatedAt()),value.finalizedAt()==null ? null : Timestamp.from(value.finalizedAt()),value.version()-1);
        if(written!=1) throw new ConflictException("Scorecard changed; reload before saving");
        jdbc.update("insert into interview_scorecard_revisions(interview_id,version,snapshot) values(?,?,?::jsonb)",value.interviewId(),value.version(),json.writeValueAsString(value));
    }
    public Page<Scorecard> history(UUID id,int page,int size) {
        long total=jdbc.queryForObject("select count(*) from interview_scorecard_revisions where interview_id=?",Long.class,id);
        var rows=jdbc.query("select snapshot from interview_scorecard_revisions where interview_id=? order by version desc limit ? offset ?",
            (rs,n)->json.readValue(rs.getString("snapshot"),Scorecard.class),id,size,(long)page*size);
        return Page.of(rows,total,page,size);
    }
}
