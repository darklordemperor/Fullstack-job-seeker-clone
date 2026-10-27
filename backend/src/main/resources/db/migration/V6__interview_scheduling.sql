-- Additive PostgreSQL 17-compatible migration; Flyway owns the transaction.
create table interviews (
    id uuid primary key,
    application_id uuid not null references applications(id) on delete cascade,
    employer_id uuid not null references users(id),
    candidate_id uuid not null references users(id),
    status varchar(20) not null check (status in ('PROPOSED','CONFIRMED','DECLINED','CANCELLED')),
    mode varchar(20) not null check (mode in ('ONLINE','IN_PERSON')),
    location varchar(1000) not null,
    timezone varchar(100) not null,
    selected_slot_id uuid,
    version integer not null default 0 check (version >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check ((status = 'CONFIRMED') = (selected_slot_id is not null))
);
create table interview_slots (
    id uuid primary key,
    interview_id uuid not null references interviews(id) on delete cascade,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    check (ends_at > starts_at),
    unique (interview_id, id)
);
alter table interviews add constraint fk_interview_selected_slot
    foreign key (id, selected_slot_id) references interview_slots(interview_id, id) deferrable initially deferred;
create unique index idx_interviews_active_application on interviews(application_id) where status in ('PROPOSED','CONFIRMED');
create index idx_interviews_application on interviews(application_id);
create index idx_interviews_employer on interviews(employer_id, created_at desc, id);
create index idx_interviews_candidate on interviews(candidate_id, created_at desc, id);
create index idx_interviews_selected_slot on interviews(selected_slot_id);
create index idx_interview_slots_time on interview_slots(interview_id, starts_at);
