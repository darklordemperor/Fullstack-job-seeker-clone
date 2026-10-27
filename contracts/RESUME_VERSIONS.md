# Private résumé versions and application attachments

Candidates manage PDF versions at `/job-seeker/resumes`, linked from their profile and application controls. Uploading selects the new PDF for future applications. Candidates can select an older version, stop attaching a PDF, download their own versions, and delete an unused version after confirmation. Employers can download only the version attached to an application for a job they own.

## Rules and retention

- Up to **10 versions per candidate**, each at most **5 MiB (5,242,880 bytes)**. The limit includes versions retained by applications; if all ten are attached, additional versions require a separately designed retention policy. There is no automatic deletion or expiry.
- Files require a `.pdf` filename, `application/pdf` content type, a supported `%PDF-1.x`/`%PDF-2.0` header and an ending `%%EOF` marker. These checks reject empty, oversized and obvious non-PDF uploads; they are **not full PDF parsing, malware scanning or content sanitization**. Files are downloaded as attachments, never embedded in a public viewer.
- Filenames are reduced to a leaf name, stripped of control characters and limited to 180 characters. Clients cannot choose an owner ID, storage path or public URL.
- Upload, selection, clearing, deletion and submission capture serialize on the candidate's database row. The version limit and single-current rule are enforced transactionally. Deleting a selected unused version clears the selection without choosing another.
- Submission captures the selected PDF when its transaction takes the candidate lock. Later uploads, selection changes, profile edits and application status changes do not replace it. A concurrent selection/submission is resolved by lock order.
- Referenced versions cannot be deleted (409). Unused deletion removes bytes and metadata in one transaction. Application deletion removes its attachment reference; it does not automatically delete the candidate's version.
- Existing `resumeUrl` fields remain supported and captured in the original profile snapshot. Old applications are not backfilled with today's PDF. External URLs remain external links and cannot provide the same immutable-byte guarantee.

## API contract

All routes require a purpose-bound access token. Metadata endpoints return the existing `ApiResponse<T>` envelope. Wrong roles return 403; missing/foreign-owned versions and attachments return 404. Invalid files/malformed IDs/missing file parts return 400, the transport upload limit returns 413, and retention/capacity conflicts return 409. Errors use the existing JSON envelope.

| Method | Route | Result |
|---|---|---|
| GET | `/api/job-seeker/resumes` | Metadata-only list, maximum 10, newest first |
| POST | `/api/job-seeker/resumes` | Multipart `file`; create version and select it |
| PUT | `/api/job-seeker/resumes/{resumeId}/current` | Select owned version; empty body |
| DELETE | `/api/job-seeker/resumes/current` | Clear selection; retain files |
| DELETE | `/api/job-seeker/resumes/{resumeId}` | Delete an unused owned version |
| GET | `/api/job-seeker/resumes/{resumeId}/file` | Candidate-owned binary PDF |
| GET | `/api/applications/{applicationId}/resume` | Candidate's submitted PDF |
| GET | `/api/employer/applications/{applicationId}/resume` | Submitted PDF for an employer-owned job |

Example version data:

```json
{
  "id": "1a6699fe-7f7e-4ace-bf31-4a7522db4673",
  "fileName": "product-engineer.pdf",
  "sizeBytes": 184320,
  "createdAt": "2026-10-25T00:00:00Z",
  "current": true,
  "attached": false
}
```

Application detail previously contained `application`, `submission` and `timeline`. It now adds nullable `resume: {id, fileName, sizeBytes, createdAt}`. Existing fields, application request/response shapes and list payloads remain unchanged. No document bytes, owner IDs or storage locations appear in metadata. Application detail reads one additional bounded metadata query, not per-list-item queries.

Successful downloads are binary `application/pdf`, with `Content-Disposition: attachment`, `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. They deliberately do not use the JSON envelope. Angular fetches through its authenticated HTTP repository, creates a temporary object URL for the download, then revokes it. Tokens are never placed in download URLs.

## Architecture and database

Flow: Angular page → component-scoped `ResumesStore` → repository token → HTTP repository → controller → `ResumeUseCase` → `ResumePort` → JDBC adapter. `ResumeRules` contains framework-free validation. The application submission use case attaches the current version in the same transaction as its profile snapshot, event and notification.

<!-- DATABASE_ARCHITECTURE:START -->
Flyway **V10** targets PostgreSQL **17**, following this repository's explicit convention.

| Table | Change | Purpose |
|---|---|---|
| `resume_versions` | New UUID key, candidate FK, filename, bounded bytea, size check, created_at, current flag | Private immutable documents, transactional selection and deletion |
| `application_resumes` | New application PK/FK and restrictive version FK | Immutable association to the exact submitted PDF |

Indexes: `(user_id, created_at DESC, id)` for bounded owner history; unique partial `(user_id) WHERE is_current` for one selection; `(resume_id)` for retention checks and FK lookup. The application primary key supports attachment lookup. Metadata projections exclude bytea, avoiding fetching file contents for lists/details.

Bytes live in PostgreSQL rather than the public avatar filesystem. At the explicit 10 × 5 MiB per-user bound this avoids filesystem/database rollback races and includes PDFs in the existing database backup. Aggregate database size and backup duration still grow with users; larger deployments should introduce a private object-storage adapter and a deliberate lifecycle policy as separate work. No new dependencies or storage service are introduced.

The additive migration creates two new tables and indexes, with no historical backfill or existing-row rewrite. Flyway owns its transaction. Foreign keys require short locks on referenced tables; schedule populated deployment accordingly. Back up before upgrading; rehearse restoration in a separate database. Never remove Flyway history or application volumes to roll back.

Read-only query diagnostics on PostgreSQL 17 test fixtures (2026-10-25) measured approximately 0.123 ms for owner history and 0.098 ms for submitted metadata. The latter used `application_resumes_pkey`; the planner preferred sequential scans for some small fixture tables. These figures are diagnostic only, not a production-load benchmark. Reproduce with `backend/scripts/evaluate-resumes.sql`; output is in ignored `backend/target/resume-query-plans.log`.
<!-- DATABASE_ARCHITECTURE:END -->

## Verification

Integration and E2E fixtures must use `jobsdb_test`. Commands: backend `./mvnw verify` with `JOBSDB_INTEGRATION_TESTS=true` and the isolated test database variables; frontend `npm run test:coverage`, `npm run build`, `npm run check:e2e`, and `npm run test:e2e -- resume-workflows.spec.ts --project=chromium --project=webkit`.

Measured results on 2026-10-25:

- **127 backend tests passed**, zero failures/skips, including real PostgreSQL integration. All existing coverage gates passed. `ResumeRules` has 100% measured line/branch coverage; `ResumeUseCase` and `ResumeController` have 100% measured line/method coverage. The JDBC adapter has 37/38 covered lines, 9/10 branches and all 17 methods covered; the missing path is a nonexistent candidate at the internal locking boundary.
- **172 frontend tests in 43 files passed**. Statements 73.08%, branches 76.01%, functions 58.70%, lines 73.70%. Coverage gates, architecture checks, production build and E2E typecheck passed.
- All eight targeted résumé browser workflows passed in Chromium/WebKit at 320×568, 768×1024, 844×390 and 1440×900. The complete final regression then passed **106 tests** (81 Chromium, 25 WebKit) in 9.6 minutes, including **350 role/route/viewport combinations** across 14 sizes. Final mobile/desktop screenshots were visually reviewed; the file picker clears after success and small file sizes retain a decimal digit. No finite matrix proves all possible sizes or real-device behavior.
- Production-container checks passed before and after recreating PostgreSQL/backend/frontend: V1–V10, private PDF uploads/downloads through Nginx, original submitted bytes, selection and retention, authorization/cache headers, plus existing application/notification/avatar workflows and desktop/mobile deep-link reloads.
- A fresh V9 backup was restored and migrated to V10 in an isolated PostgreSQL 17 container; all **23 existing tables** retained matching counts/content fingerprints. No historical résumé attachments were created.

Coverage includes empty/oversized/disguised files, filename normalization, missing multipart fields, compact metadata, OpenAPI binary response/security contracts, roles and cross-account access, exact submitted bytes after replacement, legacy URLs, deletion retention, application rollback on attachment failure, concurrent capacity/selection, UI loading/error/retry, failed-upload retention, selection/clear/delete controls and authenticated downloads. No malware scanning, hosted CI or real-device test is claimed. Firefox retains its previously documented Windows launch limitation.

## Local deployment

On 2026-10-25 the verified images were deployed at http://localhost:4200 (API 8080, pgAdmin 5050). PostgreSQL 17.10 reports successful Flyway V1–V10. All **23 pre-existing tables** retained identical counts and content fingerprints; the new résumé tables contain zero rows. No test accounts or résumé fixtures were written to the application database. Read-only local checks passed for preserved jobs, deployed OpenAPI contracts, anonymous API rejection, protected candidate routes and desktop/mobile deep-link reloads.

The fresh V9 backup is outside Git:

```text
C:\projects\Fullstack-job-seeker-clone-backups\20261025-073135-v9
```

It contains a 58,581-byte database dump, 123-byte uploads archive (empty volume), 157,006,848-byte V9 image archive, SHA-256 hashes, private configuration, before/after fingerprints and `RECOVERY.md`. Archive checksums and recovery Compose validation passed. The database restoration and V10 migration were exercised in isolation; a complete recovery-stack cutover was not performed. Rehearsal containers/network were removed and the separate rehearsal database volume retained. Keep private backups outside Git and restore to a separate database for inspection.

Deployed backend: `sha256:ceec462ead639cbb86cb6e4eb8e36adbf4d8d78a9efffa97d7954325a3d70a65`; frontend: `sha256:6e58dfa61f12cab68e0d435c2567990b078256c8b1d70bf2bbfa30c741a4c1ae`. These exact images passed the isolated persistence checks. No dependency upgrade, commit, push or cloud deployment was performed.

Docker Desktop was initially stopped, then encountered the recurring Windows stale inference-socket error. Its failed processes were stopped and the two runtime socket folders were renamed before restart. No factory reset or application-volume deletion was used.

Ignored evidence: `backend/target/resume-verify.log`, `backend/target/site/jacoco/`, `frontend/tmp/resume-coverage.log`, `frontend/tmp/resume-regression.log`, `frontend/tmp/resume-container-persistence.log`, `frontend/tmp/resume-local-release.log`, and `frontend/test-results/` screenshots. Backup restore and deployed preservation fingerprints are kept in the private backup directory above.

## Changed files

- `backend/src/main/resources/db/migration/V10__private_resume_versions.sql`: additive schema and retention constraints.
- `backend/src/main/java/com/darklordempeor/jobsdb/domain/model/Resume.java`, `domain/service/ResumeRules.java`: framework-free metadata and file validation.
- `backend/src/main/java/com/darklordempeor/jobsdb/application/port/ResumePort.java`, `application/usecase/jobseeker/ResumeUseCase.java`: private document boundary and workflows.
- `backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/persistence/adapter/JdbcResumeAdapter.java`: scoped queries, atomic bytes/metadata and retention.
- Existing `ApplicationUseCase`, `HiringModels`, `JdbcApplicationWorkflowAdapter`, `ApplicationsController`: capture and expose submitted metadata while preserving existing contracts.
- `backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/ResumeController.java`, `interfaces/advice/GlobalExceptionHandler.java`: documented private endpoints and consistent upload errors.
- `frontend/src/app/domain/resume.model.ts`, `domain/repositories/resume.repository.port.ts`, `data/resume.repository.ts`, `core/di/repository.*.ts`: typed authenticated transport and DI.
- `frontend/src/app/features/job-seeker/resumes/`, `shared/ui/resume-download.component.ts`: responsive history, selection, confirmation and authenticated download UI.
- Existing profile, job actions, application history, employer applicants and candidate routes: feature entry points and submitted downloads.
- Corresponding unit, HTTP, integration and browser tests: boundaries, failure states, concurrency, retention and byte preservation.
