update users
set password_hash = '$2a$10$9mH9jZDJmHJD0wGCoeNUOuae3/B/0GRl.XfteWSuJFaMQvyqWzIL2',
    updated_at = now()
where email = 'admin@jobsdb.local'
  and role = 'ROLE_ADMIN';
