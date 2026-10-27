# Interview scheduling — 2026-10-23

> Updated lifecycle and coverage verification: [Interview lifecycle and coverage](INTERVIEW_LIFECYCLE_AND_COVERAGE.md). The verification section below preserves the initial V6 release results.

## User flow

Employers open **Manage jobs → Review applicants → Schedule interview**. Offer one to three times, choose online or in-person, and enter a meeting link or address. The candidate sees the invitation under **Interviews**, also linked from My applications. Both roles have Upcoming and All interviews views.

Candidates can accept one slot or decline. Either participant can cancel. Employers can reschedule an active invitation; this releases the previous booking and requires another candidate confirmation. Failed saves keep the editor open with its draft. Stale decisions report a conflict and ask the user to refresh. Calendar downloads are available only for confirmed interviews.

The existing application status remains unchanged. Interview status is independent:

```text
New invitation → PROPOSED → CONFIRMED
                    └────→ DECLINED
PROPOSED / CONFIRMED ─────→ CANCELLED
PROPOSED / CONFIRMED ─────→ PROPOSED (employer reschedules; new version and slot IDs)
```

Only applications in SUBMITTED or REVIEWING can receive new proposals/reschedules/acceptances. Cancellation remains available after an application reaches a terminal stage. Closed invitations cannot reopen; an employer can create a new invitation. One active invitation per application is allowed. Employers can now record COMPLETED or NO_SHOW after the selected slot ends, retaining the selected time and closing the round. A new invitation starts another numbered round; rescheduling keeps the existing round. V7 retains revision history, with a labeled BASELINE for older invitations. See the linked lifecycle contract for these additions.

## Time and booking rules

- Slots must start after the server's current time and no more than 365 days ahead, lasting 15–240 minutes. Offered alternatives must not overlap each other.
- Offers do not reserve time. Acceptance rejects overlap with any confirmed interview involving the same employer account or candidate, across applications. Intervals are half-open: one interview may start exactly when another ends.
- PostgreSQL application-row locks serialize changes to an invitation/application. Acceptance then locks both participant user rows in UUID order before checking overlaps and writing the confirmation. Concurrent conflicting acceptances yield one success and one 409.
- UTC instants are authoritative. An organizer timezone is stored; the UI enters/displays times in the device timezone and shows a UTC preview. Invalid local dates and daylight-saving gaps are rejected. Repeated clock times use the browser's offset choice, visible in that UTC preview; there is no arbitrary timezone/offset picker in this version.
- Calendar exports use UTC DTSTART/DTEND, a stable UID, version-based SEQUENCE, escaped text, CRLF and UTF-8-safe line folding. They are manual `.ics` snapshots. Rescheduling/cancellation does not update previously imported external calendars.

The locking design follows [PostgreSQL 17 row-lock behavior](https://www.postgresql.org/docs/17/explicit-locking.html). Calendar serialization follows the relevant content-line, text and UTC date-time rules in [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545).

## API contracts

All endpoints require an access token and use `ApiResponse<T>` with the existing `success`, `message`, `data`, `timestamp` fields. Employer paths require ROLE_EMPLOYER; candidate paths require ROLE_JOB_SEEKER. Resource ownership is checked inside the use case, not trusted from request fields.

| Method and path | Request / result |
| --- | --- |
| `GET /api/employer/interviews` | Own invitations: `upcoming=true`, `page=0`, `size=8` defaults. |
| `GET /api/job-seeker/interviews` | Candidate's own invitations; same query parameters. |
| `POST /api/employer/applications/{applicationId}/interviews` | Proposal below → interview view, version 0. |
| `PUT /api/employer/interviews/{id}?expectedVersion=0` | Replacement proposal → PROPOSED view with incremented version and new slot IDs. |
| `POST /api/job-seeker/interviews/{id}/accept` | `{ "expectedVersion": 0, "slotId": "..." }` → CONFIRMED. |
| `POST /api/job-seeker/interviews/{id}/decline` | `{ "expectedVersion": 0 }` → DECLINED; proposed invitations only. |
| `POST /api/employer/interviews/{id}/cancel` | `{ "expectedVersion": 1 }` → CANCELLED. |
| `POST /api/job-seeker/interviews/{id}/cancel` | Same body; own invitation only. |
| `GET /api/employer/interviews/{id}/calendar` | `{ "filename": "interview-<id>.ics", "content": "BEGIN:VCALENDAR\r\n..." }` inside ApiResponse. |
| `GET /api/job-seeker/interviews/{id}/calendar` | Same result, candidate ownership enforced. |

Page results contain `content`, `totalElements`, `totalPages`, `page`. Negative page values become zero and size is clamped to 1–50; empty results use totalPages=1. Sort is newest invitation first, with ID tie-breaking. `upcoming=true` includes proposed invitations with an unexpired option and confirmed interviews whose selected slot has not ended. `upcoming=false` includes closed and expired history. Three batched queries serve a nonempty page: count, compact views, slots; no per-row enrichment.

Proposal example (times must still be in the future when used):

```json
{
  "mode": "ONLINE",
  "location": "https://meet.example.com/interview",
  "timezone": "Asia/Bangkok",
  "slots": [
    { "startsAt": "2026-12-01T03:00:00Z", "endsAt": "2026-12-01T04:00:00Z" },
    { "startsAt": "2026-12-01T06:00:00Z", "endsAt": "2026-12-01T07:00:00Z" }
  ]
}
```

`mode`: ONLINE or IN_PERSON. `location`: required, at most 1,000 characters; ONLINE requires HTTPS with a hostname and no embedded credentials. `timezone`: required valid zone, at most 100 characters. `slots`: required 1–3 non-null entries with absolute start/end instants. expectedVersion is required for decisions; slotId is required for acceptance.

Example interview result:

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "applicationId": "22222222-2222-4222-8222-222222222222",
  "jobTitle": "Product Engineer",
  "companyName": "Example Company",
  "candidateName": "Example Candidate",
  "status": "PROPOSED",
  "mode": "ONLINE",
  "location": "https://meet.example.com/interview",
  "timezone": "Asia/Bangkok",
  "slots": [{
    "id": "33333333-3333-4333-8333-333333333333",
    "startsAt": "2026-12-01T03:00:00Z",
    "endsAt": "2026-12-01T04:00:00Z"
  }],
  "selectedSlotId": null,
  "version": 0,
  "updatedAt": "2026-10-23T08:00:00Z"
}
```

Views omit employer/candidate account IDs, email addresses, internal hiring notes and profile payloads. Candidate display names come from the submitted snapshot. Errors use the existing envelope: 400 invalid fields/times; 401 unauthenticated; 403 role/ownership; 404 missing application/interview; 409 duplicate active invitation, stale version, closed invitation, expired slot, terminal application or confirmed overlap. Existing APIs and response shapes are unchanged. SpringDoc documents the new endpoints under Interviews using the existing `bearer-jwt` scheme; integration tests verify its presence and response fields.

<!-- DATABASE_ARCHITECTURE:START -->
## Database architecture

Migration: `backend/src/main/resources/db/migration/V6__interview_scheduling.sql`.

| Table | Purpose / integrity |
| --- | --- |
| `interviews` | Application/participant ownership, status, format, location, timezone, selected slot, version and timestamptz creation/update times. Foreign keys retain existing application-cascade semantics. |
| `interview_slots` | Normalized options with timestamptz boundaries and positive-duration check. Cascade on invitation deletion. |

Application IDs and UUID primary keys follow existing project conventions; no PostgreSQL 18-only UUIDv7/temporal syntax or new extension is introduced. A deferred composite FK ensures the selected slot belongs to its interview. A check constraint requires exactly confirmed rows to have a selected slot. A partial unique index limits active invitations per application. Other B-tree indexes cover application, employer/date, candidate/date, selected-slot and slot/interview-time lookups.

V6 is additive and runs in Flyway's transaction. It creates/indexes new empty tables, so concurrent index construction and a rewrite of existing rows are unnecessary. Flyway version/checksum tracking provides apply-once behavior; do not run the migration manually or modify it after deployment. Rolling back the application can leave these unused additive tables in place. Do not drop them if interview data must be retained; a destructive rollback requires a separately approved backup/recovery plan.

Local EXPLAIN ANALYZE for candidate/date pagination on 22 fixture interviews selected a sequential scan and small sort, completing in 0.134 ms. That is a small-fixture observation, not a production performance benchmark or proof that a large dataset will choose the same plan. Integration tests verify migration, FK cascade, concurrent acceptance and rollback after actual slot writes. Booking overlap safety relies on application transactions taking the documented participant locks; direct SQL writers must follow the same protocol.
<!-- DATABASE_ARCHITECTURE:END -->

## Files and separation of concerns

Paths are relative to the repository root.

| Paths | Purpose |
| --- | --- |
| `backend/src/main/resources/db/migration/V6__interview_scheduling.sql` | Add scheduling tables, checks and indexes. |
| `backend/src/main/java/com/darklordempeor/jobsdb/domain/model/Interview.java` | Pure interview entity/status/slot types. |
| `backend/src/main/java/com/darklordempeor/jobsdb/domain/service/InterviewRules.java` | Pure timing, proposal and transition validation. |
| `backend/src/main/java/com/darklordempeor/jobsdb/application/model/InterviewModels.java` | Commands and compact results, separate from HTTP DTOs. |
| `backend/src/main/java/com/darklordempeor/jobsdb/application/model/InterviewCalendar.java` | Calendar serialization and UTF-8-safe escaping/folding. |
| `backend/src/main/java/com/darklordempeor/jobsdb/application/port/InterviewPort.java` | Focused scheduling persistence contract. |
| `backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/interview/InterviewUseCase.java` | Authorization, transactional orchestration, versions and booking checks. Read lists/exports use repeatable-read snapshots for consistent slot data. |
| `backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/persistence/adapter/JdbcInterviewAdapter.java` | JDBC persistence, participant locking and batched projections. |
| `backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/InterviewController.java` | Thin REST endpoints and OpenAPI descriptions. |
| `backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/request/InterviewProposalRequest.java` | Validated proposal input. |
| `backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/request/InterviewDecisionRequest.java` | Validated version and optional acceptance slot. |
| `backend/src/main/java/com/darklordempeor/jobsdb/interfaces/mapper/ApiCommandMapper.java` | Map validated proposal DTOs to application commands. |
| `frontend/src/app/domain/interview.model.ts`, `frontend/src/app/domain/interview.rules.ts` | Framework-free contracts, timing validation and UTC conversion. |
| `frontend/src/app/domain/repositories/interview.repository.port.ts` | Observable repository interface. |
| `frontend/src/app/application/use-cases/schedule-interview.use-case.ts` | Validate/normalize proposal and select create/reschedule operation. |
| `frontend/src/app/data/interview.repository.ts`, `frontend/src/app/data/mappers/interview-request.mapper.ts` | HTTP/envelope/error handling and explicit request fields. |
| `frontend/src/app/core/di/repository.tokens.ts`, `frontend/src/app/core/di/repository.providers.ts`, `frontend/src/app/core/di/use-case.tokens.ts` | Wire contracts to implementations and use cases. |
| `frontend/src/app/features/interviews/interviews.store.ts`, `frontend/src/app/features/interviews/interviews.component.ts` | Shared role-aware page, editor, confirmations and recoverable async workflow. |
| `frontend/src/app/features/employer/employer.routes.ts`, `frontend/src/app/features/job-seeker/job-seeker.routes.ts` | Lazy interview screens inside existing role guards. |
| `frontend/src/app/features/employer/applicants/applicants.component.ts`, `frontend/src/app/features/employer/dashboard/dashboard.component.ts`, `frontend/src/app/features/job-seeker/my-applications/my-applications.component.ts`, `frontend/src/app/core/layout/navbar/navbar.component.ts` | Entry points from applicant review, dashboard, applications and navigation. |

Regression tests live beside the domain rules, use cases and repositories, in `HiringIntegrationTest.java`, `interviews.store.spec.ts`, `frontend/e2e/interview-workflows.spec.ts` and the existing responsive matrix.

## Verification

Verified locally on 2026-10-23:

| Check | Result |
| --- | --- |
| Backend `mvnw verify`, integration tests enabled | **102 passed**, zero failures/errors/skips, including **20 real database/API integration tests**. |
| New scheduling business logic | `InterviewRules` and `InterviewUseCase`: **100% lines (63/63), methods (20/20), branches (82/82)**. Existing business coverage gates also passed. |
| Frontend `npm test -- --watch=false` | **97 passed across 26 files**. |
| Frontend `npm run build` | Production build and architecture import checks passed. |
| `npm run test:e2e -- --project=chromium --project=webkit` | E2E TypeScript check and **82 browser tests passed**, zero failed tests. |
| Responsive matrix | **20 routes at 14 viewport sizes = 280 route/viewport combinations**, run in Chromium. Includes breakpoint boundaries, 320 px width and short landscape height. |
| Interview workflows | Proposal failure/retry, acceptance, calendar export, reschedule, stale-version conflict, cancellation and decline passed at **320×568, 768×1024, 844×390 and 1440×900** in both Chromium and WebKit. |

Phone and desktop screenshots were also visually reviewed. These checks cover the listed sizes and browser engines; they do not prove every possible width, height or physical device. Firefox and branded Google Chrome were not run for this release.

Backend verification used Java 21 and isolated PostgreSQL **18.4** at `127.0.0.1:55437/jobsdb_test`. Flyway V6, ownership, compact response contracts, concurrent overlapping acceptances, database rollback and cascade deletion passed. PostgreSQL **17** remains the deployment/CI target; no hosted CI or Docker deployment was run.

Local generated evidence is ignored by Git: `backend/target/interview-verify.log`, `backend/target/site/jacoco/index.html`, `frontend/test-results/interview-{build,unit,e2e}.log`, `frontend/test-results/results.json` and `frontend/playwright-report/index.html`. Source tests remain in the repository. Changes are uncommitted.

## Boundaries

In-app invitations and calendar-file downloads only. No email/SMS reminders, Google/Microsoft calendar sync, automatic external cancellation, interviewer teams, video-provider integration or production dependency changes. No deployment, commit or push is included. Run Flyway through normal backend startup before using the new pages against an application database; this work migrates only the isolated test database during verification.
