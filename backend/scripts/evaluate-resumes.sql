-- Read-only diagnostics against representative isolated PostgreSQL 17 fixtures.
BEGIN TRANSACTION READ ONLY;
EXPLAIN (ANALYZE, BUFFERS)
SELECT r.id, r.file_name, r.size_bytes, r.created_at, r.is_current,
       EXISTS(SELECT 1 FROM application_resumes a WHERE a.resume_id=r.id) AS attached
FROM resume_versions r
WHERE r.user_id=(SELECT user_id FROM resume_versions LIMIT 1)
ORDER BY r.created_at DESC, r.id;
EXPLAIN (ANALYZE, BUFFERS)
SELECT r.id, r.file_name, r.size_bytes, r.created_at
FROM application_resumes ar JOIN resume_versions r ON r.id=ar.resume_id
WHERE ar.application_id=(SELECT application_id FROM application_resumes LIMIT 1);
ROLLBACK;
