-- Additive PostgreSQL 17 migration. No historical notifications are fabricated.
create table notifications (
    id uuid primary key,
    recipient_id uuid not null references users(id) on delete cascade,
    event_key varchar(180) not null,
    kind varchar(40) not null check (kind in ('NEW_APPLICATION','APPLICATION_STATUS','INTERVIEW_PROPOSED',
        'INTERVIEW_RESCHEDULED','INTERVIEW_CONFIRMED','INTERVIEW_DECLINED','INTERVIEW_CANCELLED',
        'INTERVIEW_COMPLETED','INTERVIEW_NO_SHOW')),
    title varchar(120) not null,
    message varchar(500) not null,
    href varchar(300) not null check (left(href,1)='/' and left(href,2)<>'//'),
    created_at timestamptz not null default now(),
    read_at timestamptz,
    unique(recipient_id,event_key)
);
create index idx_notifications_recipient_date on notifications(recipient_id,created_at desc,id desc);
create index idx_notifications_unread on notifications(recipient_id,created_at desc,id desc) where read_at is null;
