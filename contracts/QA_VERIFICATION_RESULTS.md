# QA verification — 2026-10-23

> Latest follow-up: [interview lifecycle and measured frontend coverage](INTERVIEW_LIFECYCLE_AND_COVERAGE.md). This report preserves the earlier QA baseline. The initial [interview scheduling release](INTERVIEW_SCHEDULING.md) and [candidate workspace release](CANDIDATE_WORKSPACE_RELEASE.md) retain their historical results.

The approved QA work is implemented locally. Changes are uncommitted. No deployment or GitHub Actions run was performed.

## Verified results

| Check | Result |
| --- | --- |
| Backend `mvnw verify` | **87 passed**, zero failures/errors/skips; includes **15 real PostgreSQL integration tests** |
| Backend business logic | **100% lines (153/153), methods (75/75), branches (46/46)** across all eight use cases, JobEnrichment and two domain services |
| Whole backend, including generated code/adapters | **91.5% lines (858/938), 89.9% methods (320/356), 86.2% branches (131/152)** |
| Angular/Vitest | **69 passed across 19 files** |
| Angular production build | Passed |
| E2E TypeScript check | Passed |
| Playwright Chromium + WebKit | **66 passed**, no skipped, unexpected or flaky tests |
| Responsive route matrix | **238 route/viewport combinations**, plus every profile drawer and moderation dialog at all 14 viewports |
| Both Compose configuration checks | Passed using `.env.example` |
| Whitespace check | `git -c core.safecrlf=false diff --check` passed |

Backend execution used Java 21 and the isolated local **PostgreSQL 18.4** cluster on port 55437, database `jobsdb_test`. The configured CI database remains PostgreSQL 17; local results do not establish that CI has passed. Browser servers on ports 8085/4207 were stopped automatically; the temporary test database was stopped after verification.

## Changes and reasons

| Files | Change |
| --- | --- |
| `backend/pom.xml` | JaCoCo 0.8.14 HTML/XML/CSV reports, fresh execution data, and a 90% per-class line/method/branch gate for business logic |
| `backend/src/test/java/com/darklordempeor/jobsdb/application/usecase/` | Missing auth refresh/logout, applicant ownership/status, pagination, inactive-job, duplicate-application and candidate-workspace scenarios |
| `backend/src/test/java/com/darklordempeor/jobsdb/domain/service/ApplicationTransitionsTest.java` | All 16 source/destination status pairs |
| `backend/src/test/java/com/darklordempeor/jobsdb/integration/HiringIntegrationTest.java` | Real SQL rollback failures, nested profile round trips/replacement, immutable submitted data, multipart avatar upload and public image delivery |
| `backend/src/test/java/com/darklordempeor/jobsdb/infrastructure/storage/LocalProfileImageAdapterTest.java` | Size/type/content rejection, path independence, normalized 256×256 PNG output and storage failure |
| `frontend/src/styles.css` | Removed the fixed body minimum width that caused overflow when a scrollbar consumed space at 320 px |
| `frontend/src/app/core/layout/navbar/navbar.component.ts` | Role-specific mobile navigation, bounded menu height, Escape and focus return |
| `frontend/src/app/features/admin/users/users.component.ts` | Stack user controls on small screens and wrap long emails; fixes the measured 11 px overflow at 320 px |
| `frontend/src/app/features/auth/` and `shared/ui/button/button.component.ts` | Semantic submit forms, associated labels, email/password validation, autocomplete and pending-submit protection |
| `frontend/src/app/features/job-seeker/profile/` | Successful saves clear old errors; failed loads offer Retry; small-screen language editor; accurate discovery/empty-state copy |
| `frontend/src/app/shared/ui/modal/` | Named dialogs, bounded height, keyboard focus containment, Escape and return to the triggering control |
| `frontend/src/app/features/jobs/job-list/job-list.component.ts` | Accessible loading status |
| Frontend specs adjacent to auth, navbar, profile and job-list code | Form/role/state/error/stale-response regression tests |
| `frontend/vitest.config.ts`, `frontend/angular.json` | Limit Angular/JSDOM concurrency to two workers; resolved observed five-second timeout flakes without weakening assertions or increasing the timeout |
| `frontend/e2e/`, `playwright.config.ts`, `proxy.e2e.conf.json`, `scripts/start-e2e-backend.mjs`, `tsconfig.e2e.json` | Real-API browser fixtures, viewport/workflow tests, test server lifecycle, isolated-database guard and type checking |
| `frontend/package.json`, `package-lock.json` | Approved dev tooling: Playwright 1.64.1 and Node 22 type definitions; no production dependency changes |
| `.github/workflows/verify.yml` | Coverage gate/artifacts, browser testing against PostgreSQL 17 and browser report artifacts |

API paths, payload shapes, database migrations and production dependencies were unchanged by this QA pass. Existing Swagger/OpenAPI integration checks still pass.

## Behavior exercised

- Refresh token failures, role and ownership restrictions, duplicate applications, all status transitions, pagination bounds and existing API contracts.
- Exceptions injected **after actual SQL writes** verify rollback of application/snapshot/event creation, status/history updates, user ban/audit and nested profile updates. These are database-backed assertions, not simulated unit-test transaction claims.
- Profile collections persist and replace correctly; submitted profiles retain the earlier complete data after later edits. Avatar uploads persist and are served as normalized public PNGs.
- Chromium visits all 17 public/authenticated routes at the 14 sizes listed in [TESTING.md](TESTING.md), checks overflow/errors, opens all six profile drawers, and checks moderation-dialog fit and keyboard behavior.
- Chromium and WebKit each pass five workflows: keyboard login/navigation/logout; save/unsave and employer review with private notes; loading/failure/retry/empty jobs; employer publication plus registration/application/settings persistence; admin ban/unban with actual permission checks.
- The coverage gate was tested with a separate transitions-only execution file: it correctly failed uncovered business classes. Checking the complete suite's original execution file then passed. The negative probe did not replace the full report.

## Artifacts

- Backend HTML: `backend/target/site/jacoco/index.html`; machine-readable `jacoco.xml` and `jacoco.csv` beside it.
- Backend test log: `backend/target/qa-backend-final.log`; JUnit XML under `backend/target/surefire-reports/`.
- Coverage gate probes: `backend/target/qa-coverage-gate-probe.log` (expected failure), `qa-coverage-gate-final.log` (pass).
- Frontend logs: `backend/target/qa-frontend-final.log`, `qa-build-final.log`.
- Browser HTML: `frontend/playwright-report/index.html`; JSON and screenshots under `frontend/test-results/`; log `backend/target/qa-browser-final.log`.

Representative screenshots were visually reviewed: home and login at 320 px, the repaired admin user rows at 320 px, candidate profile at 768 px, and employer applicants at 1440 px. Other screenshots were captured, but are not all claimed as visually reviewed. Screenshots are review artifacts, not approved pixel-diff baselines.

## Remaining limits

1. **Firefox could not launch on Windows.** Both the initial install and a forced reinstall of the Playwright-managed build failed before application navigation. Windows reports an invalid side-by-side configuration and missing dependent assembly `mozglue, version=1.0.0.0`. Firefox checks remain enabled in Linux CI but have not been verified there. This is an environment/browser-launch failure, not a passing application test.
2. **Full Docker runtime checks were blocked:** the Docker Desktop Linux engine pipe was unavailable. Compose syntax passed, but a container build/start and Nginx runtime `/api`, `/uploads` and deep-link checks remain unverified. Local Spring avatar delivery and Angular proxy flows passed.
3. **Coverage is not a proof of all behavior.** Whole-backend coverage is below 100%; remaining misses include generated mapper null handling, compatibility endpoints, unexercised adapters and infrastructure failure paths. Frontend coverage percentages were not measured; the reported frontend numbers are executed test counts.
4. The viewport suite cannot establish every width/height, real iOS/Android behavior, browser zoom, assistive technology or virtual-keyboard behavior. Real-device and full accessibility audits remain outside the measured evidence.

Commands and safeguards are in [TESTING.md](TESTING.md). The [original audit](QA_COVERAGE_AUDIT.md) is retained as a historical baseline.
