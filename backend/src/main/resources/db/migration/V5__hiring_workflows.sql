-- PostgreSQL 17; additive migration. Legacy applications intentionally have no fabricated profile snapshot.
create table application_snapshots (
    application_id uuid primary key references applications(id) on delete cascade,
    applicant_email varchar(320) not null,
    profile jsonb not null,
    captured_at timestamptz not null default now()
);
create table application_events (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references applications(id) on delete cascade,
    actor_user_id uuid references users(id) on delete set null,
    from_status varchar(32),
    to_status varchar(32) not null check (to_status in ('SUBMITTED','REVIEWING','REJECTED','HIRED')),
    internal_note varchar(2000),
    created_at timestamptz not null default now()
);
create index idx_application_events_application on application_events(application_id, created_at, id);
create index idx_application_events_actor on application_events(actor_user_id);
create index idx_applications_seeker_date on applications(job_seeker_id, applied_at desc, id);
create index idx_applications_job_status_date on applications(job_id, status, applied_at desc, id);
create index idx_jobs_employer_date on jobs(employer_id, created_at desc, id);
create index idx_refresh_tokens_user on refresh_tokens(user_id);
create table job_seeker_settings (
    user_id uuid primary key references users(id) on delete cascade,
    display_name varchar(160) not null default '',
    contact_email varchar(320) not null,
    discoverable boolean not null default false,
    recommendations boolean not null default false,
    updated_at timestamptz not null default now()
);
create table saved_jobs (
    user_id uuid not null references users(id) on delete cascade,
    job_id uuid not null references jobs(id) on delete cascade,
    saved_at timestamptz not null default now(),
    primary key (user_id, job_id)
);
create index idx_saved_jobs_job on saved_jobs(job_id);
create index idx_saved_jobs_user_date on saved_jobs(user_id, saved_at desc);
