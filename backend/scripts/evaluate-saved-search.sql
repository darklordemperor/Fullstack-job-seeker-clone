-- Read-only plan diagnostics. Run on isolated jobsdb_test after fixtures exist.
-- Small-fixture plans are evidence, not a production-scale load benchmark.
begin read only;
explain (analyze, buffers)
select j.id from jobs j cross join saved_searches c
where c.id=(select id from saved_searches order by created_at desc limit 1)
  and j.status='ACTIVE'
  and (c.query='' or position(lower(c.query) in lower(j.title))>0 or position(lower(c.query) in lower(j.description))>0)
  and (c.location='' or position(lower(c.location) in lower(coalesce(j.location,'')))>0)
  and (c.salary_min is null or j.salary_max>=c.salary_min)
  and (c.salary_max is null or j.salary_min<=c.salary_max)
  and (c.currency='' or upper(j.salary_currency)=c.currency)
order by j.created_at desc,j.id limit 8;

explain (analyze, buffers)
select distinct c.user_id from saved_searches c join users u on u.id=c.user_id
where c.enabled and not u.banned and u.role='ROLE_JOB_SEEKER'
  and (c.query='' or position(lower(c.query) in lower('Java Engineer'))>0 or position(lower(c.query) in lower('Build reliable products'))>0)
  and (c.location='' or position(lower(c.location) in lower('Bangkok'))>0)
  and (c.salary_min is null or 80000>=c.salary_min)
  and (c.salary_max is null or 50000<=c.salary_max)
  and (c.currency='' or c.currency='THB');
rollback;
