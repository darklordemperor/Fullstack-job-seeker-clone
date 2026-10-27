-- Diagnostic only: temporary synthetic data; no application rows are changed.
-- Run with psql -X -v ON_ERROR_STOP=1 -d jobsdb_test -f scripts/evaluate-search.sql
begin;
create temp table search_evaluation (
  id integer primary key,
  title text not null,
  description text not null,
  search_vector tsvector generated always as (to_tsvector('english', title || ' ' || description)) stored
) on commit drop;
insert into search_evaluation(id,title,description)
select n, case when n % 200 = 0 then 'Angular Engineer' else 'Operations Specialist' end,
  'Build reliable products and services'
from generate_series(1,20000) n;
create index on search_evaluation using gin(search_vector);
analyze search_evaluation;
explain (analyze, buffers)
select count(*) from search_evaluation where lower(title) like '%angular%' or lower(description) like '%angular%';
explain (analyze, buffers)
select count(*) from search_evaluation where search_vector @@ plainto_tsquery('english', 'angular');
-- Different matching semantics: partial terms and Thai substrings need explicit product decisions.
select title, term, lower(title) like '%' || lower(term) || '%' as substring_match,
  to_tsvector('english', title) @@ plainto_tsquery('english', term) as english_fulltext_match
from (values ('Angular Engineer','ang'), ('Engineering','engineer'), ('นักพัฒนาซอฟต์แวร์','พัฒนา')) examples(title,term);
rollback;
