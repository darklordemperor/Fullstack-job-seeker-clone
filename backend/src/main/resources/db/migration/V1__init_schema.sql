create extension if not exists pgcrypto;

create table users (
    id uuid primary key default gen_random_uuid(),
    email varchar(320) not null unique,
    password_hash varchar(255) not null,
    role varchar(32) not null check (role in ('ROLE_ADMIN', 'ROLE_EMPLOYER', 'ROLE_JOB_SEEKER')),
    banned boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table job_seeker_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references users(id) on delete cascade,
    full_name varchar(160),
    phone varchar(40),
    date_of_birth date,
    nationality varchar(120),
    expected_salary_min integer,
    expected_salary_max integer,
    salary_currency varchar(8),
    resume_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table employer_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references users(id) on delete cascade,
    company_name varchar(180),
    website text,
    description text,
    location varchar(180),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table skills (
    id uuid primary key default gen_random_uuid(),
    job_seeker_profile_id uuid not null references job_seeker_profiles(id) on delete cascade,
    name varchar(120) not null,
    years_of_experience integer,
    level varchar(60)
);

create table work_experiences (
    id uuid primary key default gen_random_uuid(),
    job_seeker_profile_id uuid not null references job_seeker_profiles(id) on delete cascade,
    company varchar(180) not null,
    title varchar(180) not null,
    start_date date,
    end_date date,
    description text
);

create table educations (
    id uuid primary key default gen_random_uuid(),
    job_seeker_profile_id uuid not null references job_seeker_profiles(id) on delete cascade,
    institution varchar(180) not null,
    degree varchar(180),
    field_of_study varchar(180),
    graduation_year integer
);

create table languages (
    id uuid primary key default gen_random_uuid(),
    job_seeker_profile_id uuid not null references job_seeker_profiles(id) on delete cascade,
    language varchar(120) not null,
    proficiency varchar(80)
);

create table jobs (
    id uuid primary key default gen_random_uuid(),
    employer_id uuid not null references users(id),
    title varchar(180) not null,
    description text not null,
    location varchar(180),
    salary_min integer,
    salary_max integer,
    salary_currency varchar(8),
    status varchar(20) not null default 'DRAFT' check (status in ('ACTIVE', 'CLOSED', 'DRAFT')),
    search_vector tsvector generated always as (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location, ''))
    ) stored,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_jobs_status_created_at on jobs(status, created_at desc);
create index idx_jobs_search_vector on jobs using gin(search_vector);

create table applications (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references jobs(id) on delete cascade,
    job_seeker_id uuid not null references users(id) on delete cascade,
    status varchar(32) not null default 'SUBMITTED' check (status in ('SUBMITTED', 'REVIEWING', 'REJECTED', 'HIRED')),
    applied_at timestamptz not null default now(),
    unique (job_id, job_seeker_id)
);

create table ban_records (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    reason text not null,
    banned_by uuid references users(id),
    banned_at timestamptz not null default now(),
    lifted_at timestamptz
);

create table refresh_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    token_hash varchar(255) not null unique,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
);

create table audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor_user_id uuid references users(id),
    action varchar(120) not null,
    target_type varchar(120),
    target_id uuid,
    reason text,
    created_at timestamptz not null default now()
);
