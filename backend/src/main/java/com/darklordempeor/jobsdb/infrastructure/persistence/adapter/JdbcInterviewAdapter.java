package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.application.model.InterviewModels.*;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.application.port.InterviewPort;
import com.darklordempeor.jobsdb.domain.model.*;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.*;
import java.util.*;

@Repository
public class JdbcInterviewAdapter implements InterviewPort {
    private final JdbcTemplate jdbc;
    private final tools.jackson.databind.ObjectMapper json;
    public JdbcInterviewAdapter(JdbcTemplate jdbc, tools.jackson.databind.ObjectMapper json) { this.jdbc = jdbc; this.json = json; }
    public Context lockApplication(UUID id) {
        return jdbc.query("select a.id, a.job_seeker_id, a.status, j.employer_id from applications a join jobs j on j.id=a.job_id where a.id=? for update of a",
            (rs,n) -> new Context(id, rs.getObject("employer_id", UUID.class), rs.getObject("job_seeker_id", UUID.class), ApplicationStatus.valueOf(rs.getString("status"))), id)
            .stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("Application not found"));
    }
    public void lockParticipants(UUID employer, UUID candidate) {
        jdbc.queryForList("select id from users where id in (?, ?) order by id for update", UUID.class, employer, candidate);
    }
    public boolean hasActive(UUID application) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from interviews where application_id=? and status in ('PROPOSED','CONFIRMED'))", Boolean.class, application));
    }
    public boolean overlaps(UUID employer, UUID candidate, UUID excluded, Interview.Slot slot) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            select exists(select 1 from interviews i join interview_slots s on s.id=i.selected_slot_id
                where i.status='CONFIRMED' and i.id<>? and (i.employer_id=? or i.candidate_id=?)
                and s.starts_at < ? and s.ends_at > ?)
            """, Boolean.class, excluded, employer, candidate, Timestamp.from(slot.endsAt()), Timestamp.from(slot.startsAt())));
    }
    private Map<UUID,List<Interview.Slot>> slots(List<UUID> ids) {
        Map<UUID,List<Interview.Slot>> result = new HashMap<>();
        if (ids.isEmpty()) return result;
        new NamedParameterJdbcTemplate(jdbc).query("select * from interview_slots where interview_id in (:ids) order by starts_at, id", Map.of("ids", ids), rs -> {
            result.computeIfAbsent(rs.getObject("interview_id", UUID.class), ignored -> new ArrayList<>()).add(new Interview.Slot(rs.getObject("id", UUID.class), rs.getTimestamp("starts_at").toInstant(), rs.getTimestamp("ends_at").toInstant()));
        });
        return result;
    }
    public Interview find(UUID id) {
        var rows = jdbc.query("select * from interviews where id=?", (rs,n) -> new Interview(id, rs.getObject("application_id", UUID.class), rs.getObject("employer_id", UUID.class), rs.getObject("candidate_id", UUID.class),
            Interview.Status.valueOf(rs.getString("status")), Interview.Mode.valueOf(rs.getString("mode")), rs.getString("location"), rs.getString("timezone"), List.of(), rs.getObject("selected_slot_id", UUID.class), rs.getInt("version"), rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant()), id);
        var row = rows.stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("Interview not found"));
        return new Interview(row.id(), row.applicationId(), row.employerId(), row.candidateId(), row.status(), row.mode(), row.location(), row.timezone(), slots(List.of(id)).getOrDefault(id,List.of()), row.selectedSlotId(), row.version(), row.createdAt(), row.updatedAt());
    }
    public void save(Interview value, boolean create) {
        if (create) jdbc.update("insert into interviews(id,application_id,employer_id,candidate_id,status,mode,location,timezone,version,created_at,updated_at,round_number) values (?,?,?,?,'PROPOSED',?,?,?,?,?,?,(select coalesce(max(round_number),0)+1 from interviews where application_id=?))",
            value.id(), value.applicationId(), value.employerId(), value.candidateId(), value.mode().name(), value.location(), value.timezone(), value.version(), Timestamp.from(value.createdAt()), Timestamp.from(value.updatedAt()), value.applicationId());
        else jdbc.update("update interviews set status=?,mode=?,location=?,timezone=?,selected_slot_id=?,version=?,updated_at=? where id=?",
            value.status().name(), value.mode().name(), value.location(), value.timezone(), value.selectedSlotId(), value.version(), Timestamp.from(value.updatedAt()), value.id());
        jdbc.update("delete from interview_slots where interview_id=?", value.id());
        for (var slot : value.slots()) jdbc.update("insert into interview_slots(id,interview_id,starts_at,ends_at) values (?,?,?,?)", slot.id(), value.id(), Timestamp.from(slot.startsAt()), Timestamp.from(slot.endsAt()));
        String event = !create && value.status()==Interview.Status.PROPOSED ? "RESCHEDULED" : value.status().name();
        var snapshot = new Snapshot(value.status(),value.mode(),value.location(),value.timezone(),value.slots(),value.selectedSlotId());
        jdbc.update("insert into interview_revisions(interview_id,version,event,occurred_at,snapshot) values (?,?,?,?,?::jsonb)", value.id(),value.version(),event,Timestamp.from(value.updatedAt()),json.writeValueAsString(snapshot));
    }
    public Page<Revision> history(UUID id, int page, int size) {
        long count = jdbc.queryForObject("select count(*) from interview_revisions where interview_id=?",Long.class,id);
        var rows = jdbc.query("select version,event,occurred_at,snapshot from interview_revisions where interview_id=? order by version desc limit ? offset ?",
            (rs,n) -> new Revision(rs.getInt("version"),rs.getString("event"),rs.getTimestamp("occurred_at").toInstant(),json.readValue(rs.getString("snapshot"),Snapshot.class)),id,size,(long)page*size);
        return Page.of(rows,count,page,size);
    }
    private static final String VIEW = """
        select i.*, j.title as job_title, coalesce(ep.company_name,'') as company_name,
               coalesce(snap.profile->>'fullName','Candidate') as candidate_name
        from interviews i join applications a on a.id=i.application_id join jobs j on j.id=a.job_id
        left join employer_profiles ep on ep.user_id=i.employer_id
        left join application_snapshots snap on snap.application_id=a.id
        """;
    private View row(ResultSet rs) throws SQLException {
        return new View(rs.getObject("id", UUID.class), rs.getObject("application_id", UUID.class), rs.getString("job_title"), rs.getString("company_name"), rs.getString("candidate_name"),
            Interview.Status.valueOf(rs.getString("status")), Interview.Mode.valueOf(rs.getString("mode")), rs.getString("location"), rs.getString("timezone"), List.of(), rs.getObject("selected_slot_id", UUID.class), rs.getInt("version"), rs.getTimestamp("updated_at").toInstant(), rs.getInt("round_number"));
    }
    private List<View> enriched(List<View> rows) {
        var slots = slots(rows.stream().map(View::id).toList());
        return rows.stream().map(r -> new View(r.id(), r.applicationId(), r.jobTitle(), r.companyName(), r.candidateName(), r.status(), r.mode(), r.location(), r.timezone(), slots.getOrDefault(r.id(),List.of()), r.selectedSlotId(), r.version(), r.updatedAt(), r.round())).toList();
    }
    public View view(UUID id) { return enriched(jdbc.query(VIEW + " where i.id=?", (rs,n) -> row(rs), id)).stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("Interview not found")); }
    public Page<View> list(UUID user, boolean employer, boolean upcoming, int page, int size) {
        String where = " where i." + (employer ? "employer_id" : "candidate_id") + "=?";
        if (upcoming) where += " and i.status in ('PROPOSED','CONFIRMED') and exists(select 1 from interview_slots s where s.interview_id=i.id and s.ends_at>now() and (i.status='PROPOSED' or s.id=i.selected_slot_id))";
        long count = jdbc.queryForObject("select count(*) from interviews i" + where, Long.class, user);
        var rows = jdbc.query(VIEW + where + " order by i.created_at desc, i.id limit ? offset ?", (rs,n) -> row(rs), user, size, (long)page*size);
        return Page.of(enriched(rows), count, page, size);
    }
}
