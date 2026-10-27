# Interview lifecycle and frontend coverage — 2026-10-24

## Delivered

This follow-up completes the two recommended starting tasks: measured frontend coverage with CI gates, and interview outcomes/rounds/revision history. Production-container verification, notification delivery, broader accessibility/visual baselines, generated API contracts and analytics remain separate backlog work.

Employers can record **COMPLETED** or **NO_SHOW** once the selected confirmed slot has ended. Both outcomes are employer-reported, visible to the candidate, and close the round while preserving its selected time. A stale version, another employer, an unconfirmed interview, a future end time or a previously closed round is rejected. Application status stays unchanged; recording an interview outcome does not hire or reject the application.

Past meetings are under **All interviews**. Closed cards offer **Schedule next round** to employers, opening a fresh editor with blank dates and the prior format/location. The server still requires the application to be SUBMITTED or REVIEWING. Every new invitation receives the next round number for its application, including attempts following cancellation/decline. Rescheduling changes the schedule within the same round. Existing one-active-invitation and participant-overlap protection remains in force.

Both participants can open **View history**. A paginated drawer shows each retained version, its event/time, prior location, organizer timezone, offered times and selected slot. Failed reads offer Retry; closing or replacing a request prevents stale results from reopening the drawer. The history contains no actor IDs, account IDs, email addresses or private hiring notes. Legacy entries are labeled **BASELINE**, not fabricated historical events. Outcomes are final in this version; corrections/disputes and explicit interview-round names are not implemented.

## API additions

Existing endpoints keep their paths and response envelopes. Interview views gain the additive integer `round` field. The status enum expands with `COMPLETED` and `NO_SHOW`; clients using exhaustive enum handling must support them. Existing properties are retained. Closed outcomes preserve `selectedSlotId`; only CONFIRMED interviews support calendar export.

| Endpoint | Contract |
| --- | --- |
| `POST /api/employer/interviews/{interviewId}/outcome` | Owner employer; body below. Returns updated `ApiResponse<InterviewView>`. |
| `GET /api/employer/interviews/{interviewId}/history` | Owner employer; `page=0`, `size=10`, size clamped 1–50. |
| `GET /api/job-seeker/interviews/{interviewId}/history` | Owning candidate; same pagination and redacted revision shape. |

```json
{ "expectedVersion": 1, "outcome": "COMPLETED" }
```

Both fields are required; expectedVersion must be nonnegative. The only allowed outcomes are COMPLETED and NO_SHOW. Success increments the version once. Errors use the existing envelope: 400 malformed/unsupported input, 401 unauthenticated, 403 role/ownership, 404 missing interview, 409 stale version, nonconfirmed/closed state or scheduled end still in the future.

History returns `data: {content, totalElements, totalPages, page}`. Each revision has `version`, `event`, `occurredAt` and `snapshot`. Snapshot contains only `status`, `mode`, `location`, `timezone`, `slots` and `selectedSlotId`. Each slot keeps its original `id`, `startsAt` and `endsAt`. Events are BASELINE, PROPOSED, RESCHEDULED, CONFIRMED, DECLINED, CANCELLED, COMPLETED and NO_SHOW. Ordering is version descending; negative pages clamp to zero. No revisions are embedded in list responses, keeping those payloads bounded.

SpringDoc documents these endpoints with the existing bearer-jwt scheme. The new integration test verifies status rules, response data, privacy, pagination, rollback and ownership. Existing contract tests were updated for the additive round field.

<!-- DATABASE_ARCHITECTURE:START -->
## Database architecture

Migration: `backend/src/main/resources/db/migration/V7__interview_lifecycle.sql`. PostgreSQL **17** remains the target; no PG18-only syntax, extension or new production dependency is introduced.

| Table | Change / reason |
| --- | --- |
| `interviews` | Positive `round_number`, unique per application; expand allowed status and selected-slot consistency constraints. Existing invitations are numbered by creation time/ID. |
| `interview_revisions` | Append a compact JSONB schedule snapshot for each version, event and timestamptz. Composite primary key `(interview_id, version)` supports history lookup/order and prevents duplicate versions. Foreign key cascades on interview deletion. |

Creation still locks the application before selecting its next round number. All interview writes and revision inserts share one transaction. An injected failure after an actual revision insert was verified to roll back both the outcome and revision. Completed/no-show rows retain the selected-slot FK; the existing partial unique index reserves active applications only for PROPOSED/CONFIRMED. History uses two bounded queries (count and page), without per-revision slot queries.

V7 backfills existing rows and creates one BASELINE at each current version; 44 existing invitations were preserved in the local test database. Prior discarded schedules are unavailable. The migration updates rows and takes table locks while changing constraints/indexing; schedule a maintenance window or use a separately designed staged migration for a large production table. This is not a zero-downtime claim. Flyway owns the transaction/checksum; do not modify V6 or an already-applied V7. A downgrade to older application code is unsafe once new status values exist; retain a tested backup and roll forward, or prepare an explicit data-compatible rollback.

Local EXPLAIN ANALYZE for one history page over 101 fixture revisions chose a sequential scan and small sort, taking 0.071 ms. That small-fixture observation is not a production benchmark. No redundant JSONB index was added because history is filtered by interview ID, not arbitrary snapshot fields. The composite primary key also indexes the foreign-key lookup.
<!-- DATABASE_ARCHITECTURE:END -->

## Coverage

`npm run test:coverage` runs architecture checks, the existing Angular/Vitest tests and measured coverage. The only added dependency is development-only `@vitest/coverage-v8@4.1.7`, matching installed Vitest. No application dependencies or frameworks were upgraded.

| Metric | Before new tests | Current |
| --- | --- | --- |
| Statements | 63.55% | 68.54% (2118/3090) |
| Branches | 68.46% | 72.13% (888/1231) |
| Functions | 47.36% | 51.84% (267/515) |
| Lines | 64.63% | 69.39% (1093/1575) |

The implementation also grew during this work, so denominators differ between baseline and current results. All three frontend use cases and the application-transition/work-experience rules have 100% line/function/branch coverage; interview rules have 100% lines/functions and 97.14% branches. The broader app still has uncovered UI/auth/data paths; the report makes those visible rather than claiming complete coverage.

Whole-app floors are 68% statements, 70% branches, 50% functions and 68% lines. Each executable domain/use-case file has a 90% floor on all four metrics. Vitest 4 only supports `perFile` globally, so the configuration discovers exact source filenames for the stricter gates. Newly added business files are included automatically. Tests, type-only model/port files, route declarations and bootstrap configuration are excluded; untested app implementation files remain included. HTML, LCOV and JSON reports are uploaded by CI even after failure.

An isolated negative probe raised global lines and the interview-rule branch threshold to 100%. The test suite passed but the command exited nonzero, naming both unmet thresholds. The real configuration then passed without weakening its thresholds. [Angular coverage guidance](https://angular.dev/guide/testing/code-coverage) explains the builder options used here.

## Files changed and purpose

Paths below are repository-relative.

| Files | Purpose |
| --- | --- |
| `frontend/package.json`, `frontend/package-lock.json`, `frontend/angular.json`, `frontend/vitest.config.ts` | Provider, reproducible coverage command, source-map-aware inclusion, reports and gates. |
| `.github/workflows/verify.yml` | Run the coverage gate and retain frontend report artifacts. |
| `backend/src/main/resources/db/migration/V7__interview_lifecycle.sql` | Round numbering, status constraints and retained revision table/backfill. |
| `backend/src/main/java/com/darklordempeor/jobsdb/domain/model/Interview.java`, `domain/service/InterviewRules.java` under the same package root | Terminal outcomes and pure eligibility/timing rules. |
| `application/model/InterviewModels.java`, `application/port/InterviewPort.java`, `application/usecase/interview/InterviewUseCase.java` under that package root | Compact history types, bounded persistence contract, authorized transactional outcomes/history. |
| `infrastructure/persistence/adapter/JdbcInterviewAdapter.java` under that package root | Persist rounds/revisions atomically; read history without N+1 queries. |
| `interfaces/dto/request/InterviewOutcomeRequest.java`, `interfaces/rest/InterviewController.java` under that package root | Validated outcome input, role-specific endpoints and OpenAPI. |
| `frontend/src/app/domain/interview.model.ts`, `domain/repositories/interview.repository.port.ts`, `data/interview.repository.ts` under the app root | Typed new states/history and explicit HTTP request mapping. |
| `frontend/src/app/features/interviews/interviews.store.ts`, `interviews.component.ts` in that directory | Outcome confirmations, new-round editor, history loading/error/pagination and stale-response protection. |
| Adjacent interview specs, `frontend/src/app/core/http/error.interceptor.spec.ts`, `frontend/src/app/domain/application-transitions.spec.ts` | Regression and meaningful coverage gaps: server failures, terminal rules, drafts, permissions and history behavior. |
| Backend `InterviewRulesTest`, `InterviewUseCaseTest`, `InterviewCalendarTest`, `HiringIntegrationTest` | Rules, ownership, retained selected times, new view contract, actual SQL rollback and cascade cleanup. |
| `frontend/e2e/interview-workflows.spec.ts` | Real-API history/next-round workflows, client clock-skew rejection and dialog focus return at four viewport sizes. |
| README and contract/testing guides | Explain behavior, API additions, migration risks and measured limits. |

## Verification

| Check | Result |
| --- | --- |
| Backend `mvnw verify` with integration tests enabled | **105 passed**, including **21 real PostgreSQL/API tests**; zero failures/errors/skips. |
| Scheduling business logic | InterviewRules + InterviewUseCase: **100% lines (73/73), methods (25/25), branches (92/92)**; existing coverage gates passed. |
| Frontend `npm run test:coverage` | **108 passed across 29 files**; global and exact-file gates passed. |
| Negative coverage-gate probe | Expected exit **1** for an unmet global line threshold and an unmet individual domain-file branch threshold; the normal report was preserved. |
| Angular production build and architecture checks | Passed. |
| Browser regression | **74 other scenarios passed** in the broad run, including the **280 route/viewport combinations**. All **8 interview workflows passed** in a corrected targeted run across Chromium and WebKit. |
| Changed workflow viewport sizes | 320×568, 768×1024, 844×390 and 1440×900 in both engines. |

The initial broad run exposed a WebKit focus-return failure in the history drawer. Focusing the initiating button before opening the drawer fixed it; a component test and both browser engines verify it. The added client-clock-skew check also required a fresh employer login per viewport because refresh-token rotation correctly invalidates reused tokens. The corrected targeted run had zero failed, skipped or flaky tests. The 82 distinct scenarios above were verified across runs; this is not a claim of a single final 82-test run.

Browser tests verify that a fast client clock cannot bypass the server's outcome timing rule. Actual completed/no-show persistence, next-round eligibility and revision rollback are verified by database/API tests; browser tests do not fast-forward the backend clock. Phone/desktop screenshots were reviewed separately from automated overflow checks. No finite viewport suite proves all sizes, zoom levels or physical devices. Firefox, branded Google Chrome, hosted CI and a production Docker runtime were not verified in this follow-up.

Evidence is ignored by Git: backend test log and JaCoCo report under `backend/target/`; the corrected 8-test browser JSON at `backend/target/lifecycle-browser-results.json`; frontend HTML/LCOV/JSON under `frontend/coverage/`; logs and the negative probe under `frontend/tmp/`. Final visual captures are under `frontend/tmp/lifecycle-visual/`. Earlier interrupted/failed browser logs are retained as diagnostics, not passing evidence.

No commit, push, deployment, external messages or application-database migration was performed. Local verification uses an isolated `jobsdb_test` PostgreSQL 18.4 database; PostgreSQL 17 CI remains configured but was not run on GitHub. Email reminders, calendar synchronization and automatic outcome assignment are not included.
