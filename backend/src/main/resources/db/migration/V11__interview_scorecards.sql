-- PostgreSQL 17; additive, private employer feedback with no historical backfill.
CREATE TABLE interview_scorecards (
    interview_id uuid PRIMARY KEY REFERENCES interviews(id) ON DELETE CASCADE,
    version integer NOT NULL CHECK (version > 0),
    status varchar(12) NOT NULL CHECK (status IN ('DRAFT','FINALIZED')),
    technical_skills smallint CHECK (technical_skills BETWEEN 1 AND 5),
    communication smallint CHECK (communication BETWEEN 1 AND 5),
    problem_solving smallint CHECK (problem_solving BETWEEN 1 AND 5),
    strengths varchar(2000) NOT NULL DEFAULT '',
    concerns varchar(2000) NOT NULL DEFAULT '',
    recommendation varchar(16) CHECK (recommendation IN ('STRONG_HIRE','HIRE','HOLD','NO_HIRE')),
    updated_at timestamptz NOT NULL,
    finalized_at timestamptz,
    CONSTRAINT scorecard_final_time CHECK ((status='FINALIZED') = (finalized_at IS NOT NULL)),
    CONSTRAINT scorecard_final_complete CHECK (status<>'FINALIZED' OR (
        technical_skills IS NOT NULL AND communication IS NOT NULL AND problem_solving IS NOT NULL
        AND recommendation IS NOT NULL AND (btrim(strengths)<>'' OR btrim(concerns)<>'')))
);
CREATE TABLE interview_scorecard_revisions (
    interview_id uuid NOT NULL REFERENCES interview_scorecards(interview_id) ON DELETE CASCADE,
    version integer NOT NULL CHECK (version > 0),
    snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
    PRIMARY KEY(interview_id,version)
);
