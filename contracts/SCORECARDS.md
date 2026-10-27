# Private interview scorecards

One scorecard belongs to one interview round and is visible only to the employer who owns the job. Employers open it from **Interviews → Scorecard**. Each draft save retains a revision. Finalizing saves the current assessment and makes it read-only. This does not hire, reject, rank or notify the candidate.

## Rules and compatibility

- Drafts may be saved for proposed, confirmed or completed interviews. Cancelled, declined and no-show interview feedback remains readable but cannot change.
- Finalization requires a completed interview, all three integer ratings (1–5), a recommendation and a nonblank strengths or concerns note.
- Strengths and concerns each allow 2,000 characters; surrounding whitespace is trimmed. Draft ratings and recommendations may be absent/null. Missing notes become empty strings.
- Recommendations: `STRONG_HIRE`, `HIRE`, `HOLD`, `NO_HIRE`.
- `expectedVersion` is required and nonnegative: use `0` before first save, then the returned version. Scorecard versions are independent of interview versions.
- Finalized feedback cannot be reopened, edited or deleted through the API. A new interview round starts without a scorecard.
- Existing interview, application, notification and public payloads are unchanged. Private feedback is fetched separately; candidate APIs never contain it. No historical feedback is fabricated.

## HTTP contract

Base: `/api/employer/interviews/{interviewId}/scorecard`. JWT role `ROLE_EMPLOYER` and job ownership are required for every operation, including history. Responses use the existing `ApiResponse<T>` envelope. SpringDoc `/api-docs` is the live schema.

| Method | Suffix | Result |
|---|---|---|
| GET | — | Current card, or `data: null` before first save; does not create a record |
| PUT | — | Save a draft and append its revision |
| POST | `/finalize` | Atomically save final feedback and append its immutable revision |
| GET | `/history?page=0&size=8` | Newest revision first; zero-based page clamped to 0+, size clamped to 1–50 |

Draft/finalization request (same shape):

```json
{
  "expectedVersion": 1,
  "feedback": {
    "technicalSkills": 4,
    "communication": 3,
    "problemSolving": 5,
    "strengths": "Explained the tradeoffs using concrete examples.",
    "concerns": "Explore deployment experience in a follow-up round.",
    "recommendation": "HOLD"
  }
}
```

Successful finalization response:

```json
{
  "success": true,
  "message": "Scorecard finalized",
  "data": {
    "interviewId": "00000000-0000-4000-8000-000000000001",
    "version": 2,
    "status": "FINALIZED",
    "feedback": {
      "technicalSkills": 4,
      "communication": 3,
      "problemSolving": 5,
      "strengths": "Explained the tradeoffs using concrete examples.",
      "concerns": "Explore deployment experience in a follow-up round.",
      "recommendation": "HOLD"
    },
    "updatedAt": "2026-10-25T08:00:00Z",
    "finalizedAt": "2026-10-25T08:00:00Z"
  },
  "timestamp": "2026-10-25T08:00:00Z"
}
```

Drafts use `status: DRAFT` and `finalizedAt: null`. History returns `data: { content: Scorecard[], totalElements, totalPages, page }`. No employer, candidate or actor IDs are added to feedback. Error responses retain `success: false`, `message`, `data: null`: 400 invalid body/rating/note or incomplete final assessment; 401 missing/invalid authentication; 403 wrong role or job owner; 404 unknown interview; 409 stale version, finalized record, closed interview or premature finalization.

The UI preserves unsaved input on a failed save, offers explicit discard/reload confirmation and confirms finalization. Revision dialogs trap keyboard focus and return focus to their trigger. Recommendations are human-entered evidence, not automated decisions.

## Architecture and transactions

Backend request flow: `ScorecardController` → `ApiCommandMapper` → `ScorecardUseCase` → `ScorecardRules` and focused `ScorecardPort` → `JdbcScorecardAdapter`. Domain models/rules and the port have no Spring dependency. The use case owns the transaction.

Before saving, ownership is checked, the existing application row is locked, and interview state is re-read. Interview lifecycle writes use this same lock. Stale versions fail instead of overwriting another tab's feedback. The current row and JSONB revision are committed together; a revision-write failure rolls back the current-row update. The adapter also checks version and draft status on conflict updates. History count and content share a repeatable-read transaction.

Frontend: `domain/scorecard.model.ts` and `scorecard.rules.ts` define the contract/validation; `data/scorecard.repository.ts` maps HTTP envelopes and explicit request fields; `core/di/` binds the repository port; `features/employer/scorecard/` owns the SignalStore and responsive editor. Existing interview cards link to the lazy `/employer/interviews/:id/scorecard` route. No Angular dependency enters the domain rules.

<!-- DATABASE_ARCHITECTURE:START -->
## V11 database architecture

PostgreSQL **17** is retained as required by this repository; no PostgreSQL 18 features, dependencies or extensions are introduced. Flyway applies the additive migration transactionally once; Hibernate remains `ddl-auto=validate`.

| Table | Key / storage | Purpose |
|---|---|---|
| `interview_scorecards` | `interview_id` UUID PK/FK → interviews; typed ratings/notes/status/version; timestamptz dates | Current private assessment per round |
| `interview_scorecard_revisions` | `(interview_id, version)` PK; interview FK → scorecards; JSONB snapshot | Saved revision history |

Both foreign keys cascade only when the parent interview is deleted by an existing administrative/database lifecycle; there is no scorecard delete endpoint. PK B-tree indexes cover foreign-key lookup, current-card lookup, per-interview count and reverse version ordering. No duplicate indexes or JSONB GIN index are needed: snapshots are retrieved by interview/version, never searched by content.

Checks enforce positive versions, allowed statuses/recommendations, ratings 1–5, final timestamp consistency and complete final feedback. No existing tables are rewritten or backfilled. Existing application versions can ignore the additive tables. Revision pages are bounded to 50; default UI pages contain eight entries. Offset pagination matches existing contracts and is scoped to one interview's small revision stream. No partitioning is warranted at current scale. This history is application-immutable, not a tamper-proof ledger against database administrators.

Schema and transaction verification: PostgreSQL 17 integration tests cover empty reads, incomplete drafts, rollback, concurrent writes, finalization, ownership and per-round isolation. Local restore rehearsal and query-plan evidence are recorded below.
The isolated database's `EXPLAIN (ANALYZE, BUFFERS)` used `interview_scorecard_revisions_pkey` for the history lookup (bitmap index scan); execution took 0.062 ms on the small fixture dataset. This validates index applicability, not production-scale performance. Evidence: `backend/target/scorecard-query-plan.txt`.
<!-- DATABASE_ARCHITECTURE:END -->

## Verification

```bash
cd backend
# Set JOBSDB_INTEGRATION_TESTS=true and TEST_DATABASE_* for isolated jobsdb_test.
./mvnw verify
cd ../frontend
npm run test:coverage
npm run build
npm run test:e2e -- e2e/scorecard-workflows.spec.ts --project=chromium --project=webkit
```

On Windows use `mvnw.cmd` and `npm.cmd`. Never point integration or browser fixtures at the application database. The browser tests use real draft/history/conflict APIs at 320×568, 768×1024, 844×390 and 1440×900. Backend integration tests move only an isolated interview fixture into the past to test completion and finalization; browser clock changes cannot bypass the server clock. Component tests cover final confirmation and immutable rendering.

## Changed source files

Backend Java paths below are relative to `backend/src/main/java/com/darklordempeor/jobsdb/`.

| File | Reason |
|---|---|
| `domain/model/Scorecard.java` | Framework-free feedback, lifecycle and recommendation types |
| `domain/service/ScorecardRules.java` | Validation, editability and finalization invariants |
| `application/model/ScorecardCommand.java` | Transport-independent save input |
| `application/port/ScorecardPort.java` | Focused persistence contract |
| `application/usecase/interview/ScorecardUseCase.java` | Authorization, shared lock, transaction, paging and timestamp precision |
| `infrastructure/persistence/adapter/JdbcScorecardAdapter.java` | Current-row persistence, version guard and revision snapshots |
| `interfaces/dto/request/ScorecardRequest.java` | Validated and documented HTTP input |
| `interfaces/mapper/ApiCommandMapper.java` | Explicit HTTP-to-command boundary |
| `interfaces/rest/ScorecardController.java` | Private endpoints and OpenAPI descriptions |
| `backend/src/main/resources/db/migration/V11__interview_scorecards.sql` (repository-relative) | Add two constrained tables without modifying existing records |

Frontend paths below are relative to `frontend/src/app/`.

| File | Reason |
|---|---|
| `domain/scorecard.model.ts` | Scorecard response and feedback types |
| `domain/scorecard.rules.ts` | Pure validation and empty draft factory |
| `domain/repositories/scorecard.repository.port.ts` | UI-facing repository contract |
| `data/mappers/scorecard-request.mapper.ts` | Allowlisted request mapping and note trimming |
| `data/scorecard.repository.ts` | HTTP transport, encoded IDs, envelopes and bounded pages |
| `core/di/repository.tokens.ts`, `core/di/repository.providers.ts` | Register the repository implementation at the composition root |
| `features/employer/scorecard/scorecard.store.ts` | Save/error/loading/conflict and history state |
| `features/employer/scorecard/scorecard.component.ts` | Responsive editor, confirmations, immutable view and accessible revision drawer |
| `features/employer/employer.routes.ts` | Lazy scorecard route under employer authorization |
| `features/interviews/interviews.component.ts` | Employer-only scorecard navigation |

Tests sit next to the frontend rules/repository/store/component, in `frontend/e2e/scorecard-workflows.spec.ts`, and under backend `src/test/java/.../domain/service/ScorecardRulesTest.java`, `application/usecase/interview/ScorecardUseCaseTest.java` and `integration/HiringIntegrationTest.java`. `frontend/scripts/verify-docker.mjs` checks the production scorecard and persistent revision; `verify-upgraded-app.mjs` checks deployed API documentation. README, AGENTS and the contract index describe the new feature and its constraints.

## Verified results — 2026-10-25

- Backend Maven `verify`: **133 tests passed**, zero failures/errors/skips, including real PostgreSQL 17 integration and architecture checks. Existing per-business-class coverage gates passed. New `ScorecardRules` measured 22/22 lines, 46/46 branches, 4/4 methods; `ScorecardUseCase` measured 17/17 lines, 6/6 branches, 5/5 methods.
- Frontend: **182 tests in 47 files passed**, architecture check and production build passed. Measured global coverage: statements 74.71%, branches 77.36%, functions 60.20%, lines 75.20%. New `scorecard.rules.ts` measured 100% for all four metrics. This does not mean the entire frontend has complete coverage.
- Browser regression: **16 passed** in 2.6 minutes — scorecard and existing interview workflows, each at 320×568, 768×1024, 844×390 and 1440×900 in Chromium and WebKit. Includes navigation from Interviews, real private saves, stale conflict preservation, discard confirmation, historical snapshots, restored keyboard focus, closed-interview read-only state and horizontal overflow checks. The full application browser matrix was not rerun for this release. Firefox and physical devices were not tested in this release; the previously documented Windows Firefox launch limitation remains outside this change.
- Production containers built and ran on isolated `jobsdb_test`. PostgreSQL, backend and frontend were recreated; scorecard/current revision equality, privacy, existing résumé bytes, avatar bytes, notifications, saved searches and application state persisted. Production scorecard deep links rendered at desktop/mobile sizes without page errors or horizontal overflow. Desktop/mobile screenshots were visually reviewed. A finite viewport matrix cannot prove every width/height or device behavior.
- Restore rehearsal: V10 dump restored into a new PostgreSQL 17 volume; all 25 existing tables matched baseline row counts/content hashes. V11 preserved those tables and created two empty scorecard tables. No historical feedback was invented.

The checks caught and fixed PostgreSQL microsecond versus Java nanosecond timestamp differences between the current record and JSON history, and WebKit pointer-focus restoration for revision dialogs. The frontend also waits for asynchronous state to settle in component tests, and browser locators use accessible combobox roles.

Ignored local evidence: `backend/target/scorecard-verify.log`, `backend/target/site/jacoco/`, `backend/target/scorecard-query-plan.txt`, `frontend/tmp/scorecard-unit.log`, `frontend/tmp/scorecard-build.log`, `frontend/tmp/scorecard-e2e.log`, `frontend/tmp/scorecard-container-verify.log`, `frontend/test-results/` and `frontend/tmp/docker-verification/verify-scorecard-{320,1440}.png`.

## Local deployment

The existing stack at `http://127.0.0.1:4200` now runs V11. Open **Employer → Interviews → Scorecard** for an existing round. Local read-only API/OpenAPI/browser smoke checks passed; all 25 baseline tables remained identical after deployment, and both new tables were empty. No verification accounts or feedback were written to the application database.

Verified deployed images:

- Backend: `sha256:577609755920d0eddd4e43e47c4d7d1a465a3e549429e182687e6bfaab8567b9`
- Frontend: `sha256:270016ad053e4d2a2684408e176deb29ceaec70b3729391eeb517969f3a52dd3`

Private pre-upgrade backup: `C:\projects\Fullstack-job-seeker-clone-backups\20261025-141839-v10`. Contains the 63,316-byte PostgreSQL dump, 123-byte uploads archive, 157,026,816-byte V10 image archive, SHA-256 manifest, private environment/config and baseline/restored/rehearsal/deployed fingerprints. Archive hashes and isolated recovery Compose configuration were verified. `RECOVERY.md` describes restoration into a separate new database; never restore over newer application data without accepting loss of subsequent writes. Rehearsal volume `jobsdb-scorecard-rehearsal-db-v10` is retained; its temporary containers/network were removed. No full recovery traffic cutover or hosted deployment/CI run is claimed.

The migration is additive; do not drop its tables or remove Flyway history to roll back. Keep the private backup outside Git. No dependencies were added or upgraded, and no commit or push was performed.
