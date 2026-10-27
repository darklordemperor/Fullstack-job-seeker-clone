# Hiring analytics (P3)

Open **Employer dashboard → Hiring analytics**. The page shows a submission cohort's recorded funnel, conversion rates, current statuses and average/median time-to-hire. Date and job filters persist in the URL; browser back/reload restores them. Existing dashboard stats and all existing response contracts are unchanged.

## Metric definitions

| Metric | Definition |
|---|---|
| Applications | Distinct applications to this employer's jobs, submitted during the inclusive selected UTC dates and no later than report time |
| Submitted stage | All cohort applications, including older records without submission events |
| Recorded review | Distinct cohort applications with a recorded event whose `from_status` or `to_status` is `REVIEWING`, up to report time |
| Recorded hire | Distinct cohort applications with a `HIRED` event between submission and report time |
| Stage conversion | Stage count / all cohort applications × 100, rounded to two decimals; `null` for an empty cohort. This is not conversion from the previous stage |
| Current statuses | Mutually exclusive current `SUBMITTED`, `REVIEWING`, `HIRED`, `REJECTED` counts for the same cohort |
| Time-to-hire | Earliest valid recorded hire time minus application submission time, in elapsed 24-hour days; average and median rounded to two decimals |
| Sample size | Number of applications with a valid recorded hire timestamp |
| Applications without submission history | Cohort applications with no recorded initial `SUBMITTED` event |
| Hired without timestamp | Currently hired cohort applications without a valid recorded hire timestamp; excluded from duration statistics |

Dates select **when applications were submitted**. A January application hired in February contributes to January's cohort when the report runs after that hire. This is neither a count of hires occurring during January nor time-to-fill from job publication. Recent cohorts may not have finished progressing. Rejections can happen before or after review, so rejection is shown in current statuses rather than added as a funnel stage.

Repeated events count an application once; repeated hire events use the earliest valid timestamp. Pre-submission or future hire times do not contribute. An initial submission event can be a few milliseconds earlier than `applied_at` because PostgreSQL `now()` uses transaction start while the application timestamp comes from Java; it still counts as recorded submission history. No event or timestamp is fabricated. Funnel stages need not be monotonic for imported/incomplete historical data, and current counts can differ from recorded stage counts. Current statuses are read from the query snapshot; event metrics are capped by the reported `asOf` time captured just before the query.

When no hires have timestamps, average and median are `null`, displayed as **—**. A valid very short duration may round to **0 days**, which is different from missing data.

## API contract

New additive endpoint: `GET /api/employer/analytics` with `ROLE_EMPLOYER` authentication. Every aggregate is scoped by the authenticated employer, including when no job filter is supplied. An explicit job filter must belong to that employer.

| Query parameter | Rules |
|---|---|
| `from` | ISO date `YYYY-MM-DD`, inclusive UTC; defaults to 29 days before `to` |
| `to` | ISO date, inclusive UTC; defaults to today in UTC |
| `jobId` | Optional owned job UUID; omitted means all owned jobs, regardless of current publication status |

Dates must be ordered, end no later than today, and span at most **366 inclusive days**. SQL uses `[from 00:00 UTC, to+1 day 00:00 UTC)`. All four current statuses and all three funnel stages are always returned; this bounded aggregate needs no response pagination. Candidate names, emails, IDs, application IDs, notes, résumés and scorecards are never selected or returned.

Example request: `GET /api/employer/analytics?from=2024-01-01&to=2024-01-31`

```json
{
  "success": true,
  "message": "Hiring analytics loaded",
  "timestamp": "2024-02-10T12:00:00Z",
  "data": {
    "from": "2024-01-01",
    "to": "2024-01-31",
    "asOf": "2024-02-10T12:00:00Z",
    "jobId": null,
    "applications": 6,
    "applicationsWithoutSubmissionHistory": 2,
    "funnel": [
      { "status": "SUBMITTED", "applications": 6, "conversionPercent": 100 },
      { "status": "REVIEWING", "applications": 3, "conversionPercent": 50 },
      { "status": "HIRED", "applications": 2, "conversionPercent": 33.33 }
    ],
    "currentStatuses": [
      { "status": "SUBMITTED", "applications": 1 },
      { "status": "REVIEWING", "applications": 1 },
      { "status": "HIRED", "applications": 3 },
      { "status": "REJECTED", "applications": 1 }
    ],
    "timeToHire": { "sampleSize": 2, "averageDays": 3, "medianDays": 3, "hiredWithoutTimestamp": 1 }
  }
}
```

Errors use the existing `{ success: false, data: null, message, timestamp }` envelope: 400 malformed UUID/date, reversed/future/oversized range; 401 unauthenticated; 403 wrong role or another employer's job; 404 unknown explicit job. Empty valid reports succeed with zero counts and null conversion/duration values. Live transport errors propagate to the UI, with metrics hidden and a retry action. Failure loading job choices does not suppress a valid report. Stale async responses cannot replace a newer filter result.

SpringDoc `/api-docs` documents parameters, authentication, response shape, errors and metric semantics. No existing endpoint or payload was changed.

## Implementation

Backend paths relative to `backend/src/main/java/com/darklordempeor/jobsdb/`:

| File | Purpose |
|---|---|
| `application/model/AnalyticsModels.java` | Typed aggregate totals/report, stage counts and duration result |
| `application/port/HiringAnalyticsPort.java` | Focused read-only aggregation contract |
| `application/usecase/employer/HiringAnalyticsUseCase.java` | UTC defaults/validation, optional job ownership and percentage/precision rules |
| `infrastructure/persistence/adapter/JdbcHiringAnalyticsAdapter.java` | One parameterized aggregate query with per-application event grouping |
| `interfaces/rest/HiringAnalyticsController.java` | Thin employer-only GET endpoint and OpenAPI definitions |

Frontend paths relative to `frontend/src/app/`:

| File | Purpose |
|---|---|
| `domain/analytics.model.ts` | Typed filters and report |
| `domain/analytics.rules.ts` | Framework-free UTC defaults, date/UUID/range validation |
| `domain/repositories/hiring-analytics.repository.port.ts` | Repository contract |
| `data/hiring-analytics.repository.ts` | Explicit query allowlist and envelope mapping |
| `core/di/repository.tokens.ts`, `core/di/repository.providers.ts` | Composition-root binding |
| `features/employer/analytics/analytics.store.ts` | Independent report/job-choice loading, failure and stale-response state |
| `features/employer/analytics/analytics.component.ts` | Responsive filters, metrics, textual funnel bars, statuses and data-quality explanations |
| `features/employer/employer.routes.ts` | Lazy analytics route under existing employer guard |
| `features/employer/dashboard/dashboard.component.ts` | Analytics entry link |

Tests follow existing JUnit/Mockito/MockMvc and Angular/Vitest/Playwright conventions. Backend use-case tests cover defaults, ownership, ranges, rates and rounding; integration fixtures cover exact UTC boundaries, multiple statuses, duplicate and malformed hire times, post-period progression, missing history, null statistics, authorization, compact payload and OpenAPI. Frontend tests cover validation, transport, stale responses, empty/error/retry, data completeness and true zero versus unknown duration. `frontend/e2e/analytics-workflows.spec.ts` uses real application transitions and report APIs across four viewports in Chromium/WebKit.

## Database and performance

No migrations, tables, indexes or dependencies are added. Schema stays at **V11 / PostgreSQL 17**. The analytics query reads existing `jobs`, `applications`, and `application_events`; no notifications, status changes or audit events are produced. The optional job lookup is separate and bounded to one owned job. Metrics are computed together in one SQL statement so counts and durations share one database snapshot. There are no per-application repository calls or unbounded row payloads.

Existing job-owner, application-job and application-event indexes support the query. An isolated `EXPLAIN (ANALYZE, BUFFERS)` used `idx_application_events_application`; execution was **0.594 ms** on the small fixture cohort. This is not a large-data load test. The 366-day range bounds the reporting window, not the number of applications. For materially larger installations, measure query latency and count distributions before introducing additional indexes, caching or rollups. The job selector reuses the existing employer job-list API; that API's existing unpaged contract is unchanged.

## Verification commands

```bash
cd backend
# JOBSDB_INTEGRATION_TESTS=true and TEST_DATABASE_* must target isolated jobsdb_test.
./mvnw verify
cd ../frontend
npm run test:coverage
npm run build
npm run test:e2e -- e2e/analytics-workflows.spec.ts --project=chromium --project=webkit
```

Windows equivalents use `mvnw.cmd` and `npm.cmd`. Never run write fixtures on the application database. The production verification scripts also check aggregate accuracy and responsive rendering through Nginx.

## Verified results — 2026-10-25

- **137 backend tests passed**, zero failures/errors/skips, including real PostgreSQL 17 integration and architecture tests. All existing coverage gates passed. `HiringAnalyticsUseCase` measured 20/20 lines, 18/18 branches and 5/5 methods covered.
- **192 frontend tests in 51 files passed**; architecture checks and production build passed. Global coverage: statements 75.91%, branches 77.97%, functions 60.96%, lines 76.26%. `analytics.rules.ts` measured 100% for statements, branches, functions and lines. These are measured results, not a claim of complete coverage for the entire application.
- **Eight real-API browser scenarios passed** in 52.2 seconds: Chromium and WebKit, each at 320×568, 768×1024, 844×390 and 1440×900. Covered dashboard navigation, 50% hire conversion from two applications, filter validation, URL persistence/reload/back navigation, empty/null statistics, request failure/retry, role denial and horizontal overflow. Desktop Chromium and phone WebKit screenshots were visually reviewed.
- Production Docker images built; Nginx-rendered analytics returned accurate aggregates at desktop/mobile sizes with no page errors. PostgreSQL/backend/frontend recreation preserved test accounts, jobs, applications, résumé bytes, avatar bytes, notifications, saved searches, scorecards and revisions; analytics still returned the expected metrics.
- The initial integration run exposed PostgreSQL's numeric average versus the JDBC `Double` result mapping. Explicitly casting that average to double precision fixed the error; the full backend suite then passed. Submission-event tests also preserve PostgreSQL transaction-start timestamps that precede Java submission timestamps by milliseconds.

The full application browser matrix, Firefox, physical devices and hosted CI were not rerun for P3. The finite viewport matrix does not prove every possible size. Database query-plan measurements are on a small fixture cohort, not production-load certification.

Ignored evidence: `backend/target/analytics-verify.log`, `backend/target/site/jacoco/`, `backend/target/analytics-query-plan.txt`, `frontend/tmp/analytics-unit.log`, `frontend/tmp/analytics-build.log`, `frontend/tmp/analytics-e2e.log`, `frontend/tmp/analytics-container-verify.log`, `frontend/tmp/analytics-local-release.log`, and browser screenshots under `frontend/test-results/` and `frontend/tmp/docker-verification/`.

## Local deployment and recovery

Deployed at `http://127.0.0.1:4200/employer/analytics` on 2026-10-25. Local read-only API/OpenAPI/browser checks passed. All **27 existing application tables** retained their row counts and content fingerprints. Flyway remains at **V11**. No test accounts, analytics fixtures or synthetic history were written to the application database.

Verified deployed images:

- Backend: `sha256:17ec324c29a344e909551b3a3858e9e7a572e07b632efd02256d1fed4e57568d`
- Frontend: `sha256:419dec5b92dd3fe4343875b6af7b88ae5a560290603bf48acf07100463fd2451`

Private pre-analytics backup: `C:\projects\Fullstack-job-seeker-clone-backups\20261025-232424-v11-before-analytics`. It contains a 68,439-byte PostgreSQL dump, 123-byte uploads archive, 157,050,880-byte image archive, SHA-256 manifest, private config/environment, recovery instructions and before/restored/after data fingerprints. Archive hashes and recovery Compose configuration were checked. Restoring the dump into a new isolated PostgreSQL 17 database reproduced all 27 table fingerprints. The temporary restore containers/network were removed; `jobsdb-analytics-rehearsal-db-v11` remains available.

Keep that folder outside Git; it contains private data and credentials. `RECOVERY.md` describes separate-copy restoration. A full recovery traffic cutover was not performed. Because analytics changes no schema, an image-only rollback can retain current data; restoring an older database over new writes would lose those writes. No commit, push, external deployment, dependency upgrade or production dependency addition was performed.
