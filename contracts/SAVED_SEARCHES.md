# Saved searches and in-app job alerts

Candidates manage searches at `/job-seeker/saved-searches`, accessible from their account/mobile menu. The public jobs page offers **Save this search & create alerts**, carrying its keyword/location into the creation form. The workspace adds salary criteria, current matching jobs, pause/resume controls and confirmed deletion. Existing public search endpoints and response payloads are unchanged.

## Matching and delivery rules

- Keyword: literal case-insensitive substring in title or description. Location: literal case-insensitive substring. `%` and `_` are ordinary text, not wildcard operators. Thai text is supported without English full-text stemming.
- Salary: inclusive overlap with the advertised range, in the selected three-letter currency. No conversion. A minimum filter needs the job's maximum salary; a maximum filter needs its minimum. An undisclosed required bound does not match. Zero is valid.
- At least one keyword, location or salary criterion is required. Text is trimmed; salary currency is uppercased and removed when no salary bounds exist.
- Each candidate can keep at most 20 searches. Identical normalized criteria are rejected regardless of display name; keyword/location comparison for duplicates is case-insensitive. Pause retains a search and its capacity slot. Delete frees a slot and retains existing notifications.
- Only a job's **first publication** generates alerts. Draft creation, active edits, repeated activation and closing/reopening do not generate additional alerts. Saving or resuming a search does not backfill old jobs.
- Overlapping searches produce **one notification per candidate/job**, linking to `/jobs/{jobId}`. Paused searches and banned candidates do not receive new alerts. A later-closed job may no longer be publicly available when its notification is opened.
- Current matching results include active jobs published before the search was saved, even when alerts are paused. Results and delivery share the same SQL predicate.

## API contract

All routes require `ROLE_JOB_SEEKER`. The authenticated principal supplies the owner; no owner field is accepted. Public response fields do not include user IDs or publication bookkeeping.

| Method/path | Request/result |
| --- | --- |
| `GET /api/job-seeker/saved-searches` | Array of at most 20 searches, newest first with UUID tie-breaker |
| `POST /api/job-seeker/saved-searches` | Name and criteria; returns newly enabled search |
| `PATCH /api/job-seeker/saved-searches/{searchId}` | `{ "enabled": false }` or true; returns updated search |
| `DELETE /api/job-seeker/saved-searches/{searchId}` | Returns existing success envelope with null data |
| `GET /api/job-seeker/saved-searches/{searchId}/jobs?page=0` | Existing `JobResponse` page: `content`, `totalElements`, `totalPages`, `page`; eight results per page |

Creation example:

```json
{
  "name": "Bangkok Java roles",
  "query": "Java",
  "location": "Bangkok",
  "salaryMin": 50000,
  "salaryMax": 100000,
  "currency": "THB"
}
```

Success uses `ApiResponse<T>` with `success`, `data`, `message`, `timestamp`. Example `data`:

```json
{
  "id": "a5917981-a24a-4c8b-9835-808f38a01c23",
  "name": "Bangkok Java roles",
  "query": "Java",
  "location": "Bangkok",
  "salaryMin": 50000,
  "salaryMax": 100000,
  "currency": "THB",
  "enabled": true,
  "createdAt": "2026-10-24T14:00:00Z"
}
```

Name is required, up to 80 characters; keyword up to 150; location up to 100. Salary bounds are optional non-negative 32-bit integers and minimum must not exceed maximum. Currency is required with salary bounds and must contain three letters. Page is an integer, zero-based and clamped at zero. Invalid criteria, UUIDs or query values return 400; missing authentication 401; wrong role 403; missing/other-owner search 404; duplicate criteria or capacity limit 409. Errors retain the existing failure envelope. SpringDoc documents endpoints, schemas, authentication and status codes.

The inbox item shape is unchanged; its `kind` enum gains `JOB_MATCH`. The frontend target allowlist now accepts exact internal job-detail links and still rejects external links and extra redirect parameters.

## Architecture and transactions

`SavedSearchUseCase` owns normalization, validation and matching-result enrichment. `SavedSearchPort` is the focused application boundary; `JdbcSavedSearchAdapter` owns SQL and row mapping. Controllers map validated input through `ApiCommandMapper`. No new JPA entities, framework dependencies or background infrastructure were introduced.

`EmployerUseCase.updateStatus` now runs in a transaction. First publication claims the job ID and inserts notifications with a single set-based `INSERT ... SELECT`, deduplicating recipients before insertion. Any alert-write failure rolls back the claim and job status together. A unique publication key serializes concurrent publication attempts; the existing notification event-key constraint provides another duplicate barrier. Account row locking serializes concurrent search creation so the 20-search cap cannot be exceeded.

Matching considers enabled searches visible to the delivery SQL statement. A pause committed concurrently with publication can race an already-started statement. Delivery is synchronous; a very large subscriber population would warrant a durable outbox/worker in a separately scoped change. No SMTP, push, instant streaming, ranking or external delivery is included.

Frontend components call a scoped `SavedSearchesStore`, which injects the repository interface through the existing DI composition root. Request mapping belongs to `data/mappers`; pure validation remains in `domain`. Failed saves retain entered values; failed mutations retain existing records. Request versions reject stale list/result responses and responses after destruction.

<!-- DATABASE_ARCHITECTURE:START -->
## Database architecture summary

Flyway **V9** targets the project's PostgreSQL 17 convention.

| Table | Change and reason |
| --- | --- |
| `saved_searches` | New UUID-keyed criteria records; user FK cascades deletion; typed salary bounds, currency/length/range checks, enabled flag and timestamptz creation time |
| `job_publications` | Job FK/primary key and timestamptz; one durable first-publication claim per job |
| `notifications` | Extend the checked kind enum with `JOB_MATCH`; existing fields/rows unchanged |

Indexes: user/date/id for bounded list ordering; unique user/normalized criteria for duplicate protection; partial enabled-user index for delivery; primary-key index for publication claims. No added extensions or PostgreSQL 18-only features. Existing active/closed jobs receive publication markers so reopening them does not emit historical alerts. Historical draft jobs have no reliable publication history and are treated as unpublished.

The migration is additive apart from extending the existing notification check constraint; Flyway applies it transactionally. Existing tables are not rewritten. The new-table indexes do not need concurrent creation. Notification constraint validation and publication backfill can acquire locks, so production-scale rollout should account for table size. Keep a pre-upgrade backup; restore to a separate database to rehearse rollback rather than deleting migration history or application volumes.

Read-only `EXPLAIN (ANALYZE, BUFFERS)` diagnostics in `backend/scripts/evaluate-saved-search.sql` were run against PostgreSQL 17 test fixtures on 2026-10-25. The current-match plan used `idx_jobs_status_created_at`; results and recipient selection took approximately 0.496 ms and 0.155 ms respectively. Small criteria tables used sequential scans where the planner chose them. These measurements do not establish production-scale throughput. Raw plans are in ignored `backend/target/saved-search-query-plans.log`.
<!-- DATABASE_ARCHITECTURE:END -->

## Verification

Commands and isolated-database requirements are in [Testing](TESTING.md). Integration/E2E fixtures must use `jobsdb_test`, never the application database. Run Maven `verify`, frontend `test:coverage`/`build`, and `npm run test:e2e -- saved-search-workflows.spec.ts --project=chromium --project=webkit` with that database configured. Firefox retains the previously documented Windows launch limitation.

Measured verification:

- Backend Maven `verify`: **119 tests passed**, no failures/skips, including real PostgreSQL tests. New use case, JDBC adapter and controller have 100% measured line/method coverage; executable branches in the new use case and adapter are fully covered. Existing 90% per-business-class coverage gates passed.
- Frontend Angular/Vitest: **160 tests in 38 files passed**. Statements 71.28%, branches 74.86%, functions 55.70%, lines 72.02%. Overall and pure-business-layer gates passed; this does not claim complete frontend coverage.
- Angular production build, E2E typecheck and architecture checks passed.
- Feature workflows passed in Chromium and WebKit at 320×568, 768×1024, 844×390 and 1440×900. The complete 98-test run had 97 passes and one WebKit profile-editor timing failure: the start date had not propagated before the dependent end date was filled. After adding an assertion that waits for the date constraint, all eight profile flows passed across both engines (49.8 seconds). Every scenario now has a passing result; this was not a single uninterrupted 98-pass run. Chromium's responsive matrix covered 336 role/route/viewport combinations across 14 sizes. Saved-search screenshots were visually checked at mobile and desktop sizes.
- Firefox launch was retried on 2026-10-25 and still failed before page load (`spawn UNKNOWN`, previously diagnosed as a Windows side-by-side/mozglue assembly issue). No Firefox pass is claimed.
- Restored V8 backup migrated to V9 in an isolated PostgreSQL 17 database with all 21 existing table fingerprints unchanged. Twenty publication markers and zero historical notifications were created.
- Production container smoke checks passed before and after recreating PostgreSQL/backend/frontend, including saved criteria, matching jobs, publication deduplication, inbox/read timestamp persistence, avatar byte integrity, Nginx routing/configuration, deep-link reloads, mobile/desktop layout and immutable asset caching. All fixture writes used `jobsdb_test`.

Tests cover invalid criteria, authentication/roles, cross-account reads/mutations, compact output, case-insensitive duplicate criteria, capacity and concurrent creation, concurrent publication, duplicate/reopened jobs, paused/resumed searches, banned recipients, salary/currency boundaries, missing salaries, Thai locations, literal percent text and transaction rollback after notification insertion. UI tests include validation, failed-save retention, state races/disposal, errors/retry, deletion confirmation and exact job links. No hosted CI or cloud deployment has been performed.

## Local deployment

Historical V9 release record: the local stack subsequently advanced to V10. See [the résumé release](RESUME_VERSIONS.md#local-deployment) for current images, the fresh V9 backup and preservation checks.

On 2026-10-25 the tested production images were deployed at http://localhost:4200 (API 8080, pgAdmin 5050). Flyway V1–V9 succeeded on PostgreSQL 17.10. All **21 pre-existing tables** retained identical counts and content fingerprints, including 3 users, 20 jobs and existing profiles. The migration created 20 historical publication markers, zero notifications and zero saved searches. No application-database test fixtures were created.

The fresh V8 recovery snapshot is outside Git:

```text
C:\projects\Fullstack-job-seeker-clone-backups\20261025-015334-v8
```

It contains the 53,538-byte database dump, 123-byte uploads archive (empty uploads volume), 156,985,856-byte previous-image archive, SHA-256 hashes, private configuration, before/after fingerprints and `RECOVERY.md`. The dump was restored and upgraded in an isolated PostgreSQL container with matching fingerprints. Recovery Compose configuration was validated; a complete recovery-stack cutover was not performed. Keep these private files outside Git. Restore into a separate database for inspection; do not delete migration history or application volumes.

Deployed backend image: `sha256:b7808f33ff16c466ec1cd74d9f3745df0fabab8d08fd81cfd02383d30b154bc1`; frontend: `sha256:011e09123f06503af45d351e1b7c83dcf7d6bade487aee32bde264184b02904c`. These exact images passed the isolated container persistence checks. Read-only local checks passed for preserved jobs, deployed OpenAPI contracts, anonymous API rejection, protected candidate routes, desktop/mobile rendering and deep-link reloads.

Ignored evidence logs: `backend/target/saved-search-verify.log`, `frontend/tmp/saved-search-coverage.log`, `frontend/tmp/saved-search-regression.log`, `frontend/tmp/saved-search-profile-regression.log`, `frontend/tmp/saved-search-container-persistence.log`, and `frontend/tmp/saved-search-local-release.log`. A finite viewport matrix does not prove every possible size or real-device behavior. No dependency upgrade, commit, push or cloud deployment was performed.

## Main changed files

Backend paths below are relative to `backend/src/main/java/com/darklordempeor/jobsdb/`:

- `domain/model/SavedSearch.java`, `application/model/SavedSearchCommand.java`, `application/port/SavedSearchPort.java`: framework-free data and repository boundary.
- `application/usecase/jobseeker/SavedSearchUseCase.java`: search management, input rules and matching orchestration.
- `infrastructure/persistence/adapter/JdbcSavedSearchAdapter.java`: owner-scoped queries, limits, matching and duplicate-safe delivery.
- `interfaces/rest/SavedSearchController.java`, `interfaces/dto/request/SavedSearchRequest.java`, `interfaces/mapper/ApiCommandMapper.java`: HTTP validation, documented contracts and command mapping.
- `application/usecase/employer/EmployerUseCase.java`: atomic first-publication alerts; `domain/model/Notification.java`: new event kind.

Other owning paths:

- `backend/src/main/resources/db/migration/V9__saved_searches.sql`: additive schema.
- `frontend/src/app/features/job-seeker/saved-searches/`: responsive workspace, state and component tests.
- `frontend/src/app/domain/saved-search.model.ts`, `saved-search.rules.ts`, `repositories/saved-search.repository.port.ts`: models, pure rules and contract.
- `frontend/src/app/data/saved-search.repository.ts`, `data/mappers/saved-search.mapper.ts`: transport and explicit request fields.
- Existing repository DI files, candidate routes, navbar, job-list component and notification target mapper: discoverability and links.
- `frontend/e2e/saved-search-workflows.spec.ts`, responsive matrix and corresponding backend tests: behavioral, permission, concurrency, rollback and layout verification.
- `frontend/e2e/candidate-workspace-workflows.spec.ts`: wait for the start-date constraint before testing invalid end dates, avoiding a browser automation state race.
- `frontend/scripts/verify-docker.mjs`, `frontend/scripts/verify-upgraded-app.mjs`: saved-search persistence and deployed-contract smoke checks.
