package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.application.model.HiringModels.*;
import com.darklordempeor.jobsdb.application.port.AuditPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Repository
@Transactional
public class JdbcAuditAdapter implements AuditPort {
    private final JdbcTemplate jdbc;
    public JdbcAuditAdapter(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public void audit(UUID actor, String action, String targetType, UUID targetId, String reason) {
        jdbc.update("insert into audit_logs(actor_user_id,action,target_type,target_id,reason) values (?,?,?,?,?)", actor, action, targetType, targetId, reason);
    }
}
