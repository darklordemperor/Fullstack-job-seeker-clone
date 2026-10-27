-- PostgreSQL 17. Additive, no historical alert delivery.
create table saved_searches (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    name varchar(80) not null,
    query varchar(150) not null default '',
    location varchar(100) not null default '',
    salary_min integer check (salary_min >= 0),
    salary_max integer check (salary_max >= 0),
    currency varchar(3) not null default '',
    enabled boolean not null default true,
    created_at timestamptz not null default now(),
    check (salary_min is null or salary_max is null or salary_min <= salary_max),
    check ((salary_min is null and salary_max is null and currency = '') or currency ~ '^[A-Z]{3}$'),
    check (query <> '' or location <> '' or salary_min is not null or salary_max is not null)
);
create index idx_saved_searches_user_date on saved_searches(user_id,created_at desc,id);
create unique index idx_saved_searches_criteria on saved_searches(user_id,lower(query),lower(location),coalesce(salary_min,-1),coalesce(salary_max,-1),currency);
create index idx_saved_searches_enabled on saved_searches(user_id) where enabled;
create table job_publications (
    job_id uuid primary key references jobs(id) on delete cascade,
    published_at timestamptz not null default now()
);
-- Existing active/closed jobs must not generate a new-job alert when reopened.
insert into job_publications(job_id) select id from jobs where status <> 'DRAFT';
alter table notifications drop constraint notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
    'NEW_APPLICATION','APPLICATION_STATUS','INTERVIEW_PROPOSED','INTERVIEW_RESCHEDULED',
    'INTERVIEW_CONFIRMED','INTERVIEW_DECLINED','INTERVIEW_CANCELLED','INTERVIEW_COMPLETED','INTERVIEW_NO_SHOW','JOB_MATCH'));
