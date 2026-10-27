package com.darklordempeor.jobsdb.infrastructure.persistence.adapter;

import com.darklordempeor.jobsdb.application.port.NotificationPort;
import com.darklordempeor.jobsdb.application.model.NotificationModels.Draft;
import com.darklordempeor.jobsdb.application.model.HiringModels.Page;
import com.darklordempeor.jobsdb.domain.model.Notification;
import com.darklordempeor.jobsdb.domain.exception.ResourceNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;

@Repository
public class JdbcNotificationAdapter implements NotificationPort {
    private static final String FIELDS = "id,kind,title,message,href,created_at,read_at";
    private final JdbcTemplate jdbc;
    public JdbcNotificationAdapter(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public void publish(Draft value) {
        jdbc.update("insert into notifications(id,recipient_id,event_key,kind,title,message,href) values (?,?,?,?,?,?,?) on conflict (recipient_id,event_key) do nothing",
            UUID.randomUUID(),value.recipientId(),value.eventKey(),value.kind().name(),value.title(),value.message(),value.href());
    }
    public Page<Notification> list(UUID recipient, boolean unreadOnly, int page, int size) {
        String where = " where recipient_id=?" + (unreadOnly ? " and read_at is null" : "");
        long total=jdbc.queryForObject("select count(*) from notifications"+where,Long.class,recipient);
        var rows=jdbc.query("select "+FIELDS+" from notifications"+where+" order by created_at desc,id desc limit ? offset ?",
            (rs,n)->row(rs),recipient,size,(long)page*size);
        return Page.of(rows,total,page,size);
    }
    public long unreadCount(UUID recipient) { return jdbc.queryForObject("select count(*) from notifications where recipient_id=? and read_at is null",Long.class,recipient); }
    public Notification markRead(UUID recipient, UUID id) {
        return jdbc.query("update notifications set read_at=coalesce(read_at,now()) where id=? and recipient_id=? returning "+FIELDS,
            (rs,n)->row(rs),id,recipient).stream().findFirst().orElseThrow(()->new ResourceNotFoundException("Notification not found"));
    }
    private Notification row(ResultSet rs) throws SQLException {
        var read=rs.getTimestamp("read_at");
        return new Notification(rs.getObject("id",UUID.class),Notification.Kind.valueOf(rs.getString("kind")),rs.getString("title"),
            rs.getString("message"),rs.getString("href"),rs.getTimestamp("created_at").toInstant(),read==null?null:read.toInstant());
    }
}
