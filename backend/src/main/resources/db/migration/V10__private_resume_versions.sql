CREATE TABLE resume_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name varchar(180) NOT NULL,
    content bytea NOT NULL,
    size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
    created_at timestamptz NOT NULL DEFAULT now(),
    is_current boolean NOT NULL DEFAULT false,
    CONSTRAINT resume_size_matches CHECK (octet_length(content) = size_bytes)
);
CREATE INDEX idx_resume_versions_owner ON resume_versions(user_id, created_at DESC, id);
CREATE UNIQUE INDEX idx_resume_versions_current ON resume_versions(user_id) WHERE is_current;

CREATE TABLE application_resumes (
    application_id uuid PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
    resume_id uuid NOT NULL REFERENCES resume_versions(id) ON DELETE RESTRICT
);
CREATE INDEX idx_application_resumes_version ON application_resumes(resume_id);
