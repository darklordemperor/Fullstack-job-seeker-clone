alter table job_seeker_profiles
    add column if not exists location varchar(180),
    add column if not exists summary text,
    add column if not exists profile_image_url text;

create table if not exists licenses (
    id uuid primary key default gen_random_uuid(),
    job_seeker_profile_id uuid not null references job_seeker_profiles(id) on delete cascade,
    name varchar(180) not null,
    issuer varchar(180),
    issued_year integer,
    expires_year integer,
    description text
);

insert into users (id, email, password_hash, role, banned, created_at, updated_at)
values (
    '00000000-0000-0000-0000-000000000002',
    'seed-employer@jobsdb.local',
    '$2a$10$9mH9jZDJmHJD0wGCoeNUOuae3/B/0GRl.XfteWSuJFaMQvyqWzIL2',
    'ROLE_EMPLOYER',
    false,
    now(),
    now()
)
on conflict (id) do nothing;

insert into employer_profiles (id, user_id, company_name, website, description, location)
values (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000002',
    'JobsDB Partner Companies',
    'https://th.jobsdb.com',
    'Seed employer for local job browsing data.',
    'Bangkok'
)
on conflict (id) do nothing;

insert into jobs (id, employer_id, title, description, location, salary_min, salary_max, salary_currency, status, created_at)
values
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Brand & Growth Marketing Manager', 'Drive brand and revenue growth across online, offline, and owned channels. Shape campaigns, coordinate content, commerce, and performance marketing teams.', 'Huai Khwang, Bangkok', 45000, 60000, 'THB', 'ACTIVE', now() - interval '1 day'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Senior Landscape Designer', 'Lead sustainable landscape design, project documentation, and client management for high-quality public spaces.', 'Bangkok', 42000, 65000, 'THB', 'ACTIVE', now() - interval '2 days'),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Technical Application Specialist', 'Support scientific application products with customer-facing technical guidance, demonstrations, and training.', 'Bangkok', 45000, 66000, 'THB', 'ACTIVE', now() - interval '3 days'),
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Assistant Director of Sales', 'Lead a sales team, develop revenue plans, and grow commercial partnerships in tourism and hospitality.', 'Bangkok', 70000, 100000, 'THB', 'ACTIVE', now() - interval '4 days'),
    ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'QA Tester', 'Own manual and automated test coverage for browser and mobile releases in a flexible product team.', 'Bangkok', 35000, 40000, 'THB', 'ACTIVE', now() - interval '5 days'),
    ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Production Manager (Factory)', 'Manage production, improve efficiency, and ensure quality and safety for a manufacturing operation.', 'Pluak Daeng, Rayong', 40000, 50000, 'THB', 'ACTIVE', now() - interval '6 days'),
    ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 'Property Analyst', 'Research property markets, evaluate opportunities, and prepare decision-ready analysis for commercial teams.', 'Bangkok', 32000, 48000, 'THB', 'ACTIVE', now() - interval '7 days'),
    ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', 'Key Account Manager', 'Own strategic client relationships, prepare account plans, and coordinate delivery with internal teams.', 'Bangkok', 48000, 72000, 'THB', 'ACTIVE', now() - interval '8 days'),
    ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000002', 'Frontend Angular Developer', 'Build accessible Angular interfaces, collaborate with API teams, and improve frontend performance.', 'Bangkok', 50000, 85000, 'THB', 'ACTIVE', now() - interval '9 days'),
    ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'Java Spring Boot Developer', 'Design REST APIs, implement Spring Boot services, and maintain PostgreSQL-backed business workflows.', 'Bangkok', 55000, 90000, 'THB', 'ACTIVE', now() - interval '10 days'),
    ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', 'Mobile Application Developer', 'Deliver reliable mobile experiences with Flutter or React Native and integrate secure backend APIs.', 'Chiang Mai', 42000, 72000, 'THB', 'ACTIVE', now() - interval '11 days'),
    ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 'DevOps Engineer', 'Improve CI pipelines, observability, container delivery, and cloud infrastructure for application teams.', 'Bangkok', 65000, 100000, 'THB', 'ACTIVE', now() - interval '12 days'),
    ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000002', 'Data Analyst', 'Transform business questions into dashboards, analysis, and actionable recommendations using SQL.', 'Bangkok', 38000, 60000, 'THB', 'ACTIVE', now() - interval '13 days'),
    ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000002', 'UX/UI Designer', 'Create polished product journeys, prototypes, and design systems with close engineering collaboration.', 'Bangkok', 40000, 70000, 'THB', 'ACTIVE', now() - interval '14 days'),
    ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000002', 'Customer Success Specialist', 'Help customers succeed through onboarding, account support, and clear product guidance.', 'Nonthaburi', 28000, 45000, 'THB', 'ACTIVE', now() - interval '15 days'),
    ('10000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000002', 'Digital Marketing Executive', 'Plan digital campaigns, track channel performance, and coordinate content for growth initiatives.', 'Bangkok', 30000, 50000, 'THB', 'ACTIVE', now() - interval '16 days'),
    ('10000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000002', 'Human Resources Business Partner', 'Partner with managers on hiring, employee development, and practical people operations.', 'Samut Prakan', 45000, 75000, 'THB', 'ACTIVE', now() - interval '17 days'),
    ('10000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000002', 'Financial Planning Analyst', 'Build forecasts, track performance, and provide commercial insight for planning decisions.', 'Bangkok', 48000, 78000, 'THB', 'ACTIVE', now() - interval '18 days'),
    ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000002', 'Operations Coordinator', 'Coordinate daily operations, maintain process quality, and support cross-functional delivery.', 'Pathum Thani', 26000, 40000, 'THB', 'ACTIVE', now() - interval '19 days'),
    ('10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', 'Business Development Manager', 'Develop new partnerships, assess opportunities, and build a sustainable commercial pipeline.', 'Bangkok', 60000, 95000, 'THB', 'ACTIVE', now() - interval '20 days')
on conflict (id) do nothing;
