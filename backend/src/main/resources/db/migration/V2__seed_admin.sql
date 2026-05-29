insert into users (id, email, password_hash, role, banned, created_at, updated_at)
values (
    '00000000-0000-0000-0000-000000000001',
    'admin@jobsdb.local',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'ROLE_ADMIN',
    false,
    now(),
    now()
)
on conflict (email) do nothing;
