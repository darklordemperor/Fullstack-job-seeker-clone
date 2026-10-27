# API contracts

- [Security release verification](SECURITY_RELEASE_VERIFICATION.md): approved dependency patches, clean npm audits, final local/hosted checks and deployment evidence.

- [P4 release verification](P4_RELEASE_VERIFICATION.md): accessibility fixes, Linux/browser evidence, CI publication status and dependency-audit findings.

- [Hiring analytics](HIRING_ANALYTICS.md): UTC submission cohorts, recorded funnels, conversion rates, current statuses, elapsed time-to-hire and incomplete-history handling.

- [Interview scorecards](SCORECARDS.md): private employer feedback, immutable finalization, versioned revisions, concurrency and V11 schema.

- [Private résumé versions](RESUME_VERSIONS.md): PDF uploads, authenticated downloads, immutable application attachments, retention and V10 schema.

- [Saved searches and job alerts](SAVED_SEARCHES.md): private criteria, matching jobs, first-publication delivery, V9 migration and verification.

- [In-app notifications](NOTIFICATIONS.md): private inbox, unread state, transactional events, exact-record links and V8 schema.

- [Local V4 to V7 upgrade](LOCAL_UPGRADE.md): historical data-preservation and restore rehearsal; see the later feature release notes for subsequent local upgrades.

- [Production container verification](DOCKER_VERIFICATION.md): isolated PostgreSQL 17, Nginx/API/uploads, production browser checks and persistence after recreation.

- [Interview lifecycle and coverage](INTERVIEW_LIFECYCLE_AND_COVERAGE.md): outcomes, numbered rounds, retained revisions, frontend coverage and CI gates.

- [Interview scheduling](INTERVIEW_SCHEDULING.md): invitations, timezones, concurrency, calendar export, V6 schema and verification.

- [Candidate workspace release](CANDIDATE_WORKSPACE_RELEASE.md): saved-jobs page, work experience editor, additive API contract, changed files and current validation.

- [Hiring workflows](HIRING_WORKFLOWS.md): endpoints, request/response examples, permissions, compatibility, migration, search evaluation, and verification commands.
- [Implementation summary](IMPLEMENTATION_SUMMARY.md): what changed, file ownership, local test evidence, and remaining limitations.
- [Clean Architecture implementation](CLEAN_ARCHITECTURE.md): backend/frontend layers, repository interfaces and implementations, request flows, boundary tests, and the approved architecture cleanup.
- [Testing and coverage](TESTING.md): test commands, database safeguards, coverage gates, browser matrix and CI artifacts.
- [QA verification results](QA_VERIFICATION_RESULTS.md): measured coverage, test counts, responsive fixes and remaining environment limitations.

SpringDoc generates the live schema at `/api-docs`, with Swagger UI at `/swagger-ui.html`. DTO validation and integration tests verify the hiring request and response contracts. Generated frontend clients are not currently configured.
