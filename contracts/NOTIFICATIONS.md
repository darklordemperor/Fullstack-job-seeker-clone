# In-app notifications

The authenticated `/notifications` page provides a paginated inbox, unread filter, explicit mark-as-read controls and links to the relevant application or interview. The navigation bell shows the unread count, capped visually at `99+` while retaining the full accessible count. This is an additive feature: existing workflow response shapes are unchanged.

## Events and recipients

| Event | Recipient |
| --- | --- |
| Matching job first published (V9) | Candidate with an enabled matching saved search |
| Application submitted | Job owner |
| Application status changed | Candidate |
| Interview proposed or rescheduled | Candidate |
| Interview confirmed or declined | Employer |
| Interview cancelled | The other participant |
| Interview completed or marked no-show | Candidate |

Publishing joins the workflow's database transaction. If insertion fails, the application/status/interview change rolls back too. A unique recipient/event key suppresses duplicate delivery. Application keys identify submission or the resulting status; interview keys include the optimistic version. Existing workflow rules reject duplicate submissions and stale interview updates.

Messages exclude internal hiring notes, actor IDs, email addresses and meeting locations. Links retrieve current details through existing ownership checks. Interview detail endpoints include closed rounds, so a historical alert can still open its interview. An application link opens the exact application even when it is outside the current list page.

## HTTP contract

All endpoints require a valid access bearer token. The recipient is derived from authentication; clients cannot choose another recipient. Responses use the existing `ApiResponse<T>` envelope. SpringDoc publishes the schema and authentication requirements at `/api-docs`.

| Method and path | Result |
| --- | --- |
| `GET /api/notifications?page=0&size=20&unreadOnly=false` | `content`, `totalElements`, `totalPages`, `page` |
| `GET /api/notifications/unread-count` | `{ "unreadCount": 2 }` |
| `PATCH /api/notifications/{id}/read` | Updated public notification; no request body required |
| `GET /api/employer/interviews/{interviewId}` | Existing interview view, restricted to its employer |
| `GET /api/job-seeker/interviews/{interviewId}` | Existing interview view, restricted to its candidate |

Pages are zero-based. Negative pages clamp to zero; size defaults to 20 and clamps to 1–50. Sorting is `created_at DESC, id DESC`. Unread count is independent of the current page/filter. Listing or opening a link does not mark an alert read. Repeated read requests preserve the original `readAt` timestamp.

Example inbox response:

```json
{
  "success": true,
  "data": {
    "content": [{
      "id": "d8f208af-cce5-42d0-b567-c70667101bea",
      "kind": "APPLICATION_STATUS",
      "title": "Application update",
      "message": "Your application for Backend engineer is now REVIEWING.",
      "href": "/job-seeker/my-applications?applicationId=e82c50ee-d9f6-45d8-ac25-83ff4d151d76",
      "createdAt": "2026-10-24T03:00:00Z",
      "readAt": null
    }],
    "totalElements": 1,
    "totalPages": 1,
    "page": 0
  },
  "message": "Notifications loaded",
  "timestamp": "2026-10-24T03:00:01Z"
}
```

Kinds: `JOB_MATCH` (added in V9), `NEW_APPLICATION`, `APPLICATION_STATUS`, `INTERVIEW_PROPOSED`, `INTERVIEW_RESCHEDULED`, `INTERVIEW_CONFIRMED`, `INTERVIEW_DECLINED`, `INTERVIEW_CANCELLED`, `INTERVIEW_COMPLETED`, `INTERVIEW_NO_SHOW`. `readAt` is null until read. Recipient IDs and internal event keys are never returned. See [Saved searches](SAVED_SEARCHES.md) for first-publication matching and deduplication rules.

Malformed UUID/boolean/integer input returns 400. Unauthenticated requests return 401. A missing notification and another account's notification both return 404. Business validation and conflicts on the triggering workflows retain their existing contracts. Errors use the existing failure envelope (`success: false`, `data: null`, `message`, `timestamp`).

## Architecture and schema

Backend application/interview flow: workflow use case → `NotificationPublisher` → `NotificationPort` → `JdbcNotificationAdapter`. V9 job-match delivery uses a set-based insert through `SavedSearchPort` in the publication transaction. Inbox controllers call `NotificationUseCase`; domain notification records and application port/models have no framework imports. Frontend flow: standalone inbox/bell → `NotificationsStore` → repository token → HTTP repository. The pure `notification-target` mapper allows only supported internal job/application/interview destinations.

Flyway **V8** adds `notifications` on PostgreSQL 17. Columns: UUID primary key; recipient UUID with cascading users foreign key; event key; checked kind; bounded title/message/href; creation and optional read timestamps. Indexes cover `(recipient_id, created_at DESC, id DESC)` and the same columns restricted to unread rows. `(recipient_id, event_key)` is unique. Existing tables and records are retained; historical alerts are not fabricated. Take a backup before applying migrations to a populated application database. Prefer restoring into a separate database for rollback rehearsal; do not delete Flyway history or application volumes.

The bell refreshes every 30 seconds while visible and on window focus. The inbox supports manual refresh and reloads after read operations. Session changes clear state and invalidate outstanding responses. Failed requests remain visible as errors; they do not become empty success or a false zero badge.

## Scope

This release provides in-app transactional updates only. It does not send email/push notifications, backfill old events, provide instant streaming delivery or automatically delete old alerts. Discovery/email preferences do not suppress these workflow updates. Offset pagination may shift when new events arrive; stable ordering resolves timestamp ties but does not freeze a multi-page snapshot.

## Verification

Run backend verification against isolated `jobsdb_test` with `JOBSDB_INTEGRATION_TESTS=true`, then frontend coverage/build and Playwright. Commands and database safeguards are in [Testing](TESTING.md).

Backend coverage includes event routing, idempotency, private payloads, authentication/ownership, pagination, read timestamps and rollback after notification insertion. Frontend tests cover repository errors, state/session races, read actions, safe target mapping, rendering and authenticated routing. Browser scenarios exercise both roles, persistence after reload, linked records, failed-load recovery and responsive layout.

Measured on 2026-10-24:

- Maven `verify`: **112 tests passed**, no failures or skips, including PostgreSQL 17 integration tests. Per-business-class 90% line/branch/method coverage gates passed. The new publisher, use case, JDBC adapter and controller have 100% measured line/method coverage; executable branches in the publisher/adapter are also fully covered.
- Angular/Vitest: **131 tests across 34 files passed**. Measured coverage: statements 70.37%, branches 73.92%, functions 53.73%, lines 70.82%. Existing overall and pure-business-layer gates passed. This does not mean the whole frontend has complete coverage.
- Production Angular build and frontend/backend architecture checks passed.
- Chromium notification workflows passed at 320×568, 768×1024, 844×390 and 1440×900; mobile and desktop inbox screenshots were visually reviewed. A real 320px navbar overflow was fixed by compacting the menu/account controls while retaining accessible labels.
- The complete available-browser regression run passed **90 tests** in 7.6 minutes: 73 Chromium and 17 WebKit. It includes 322 role/route/viewport combinations over 14 sizes, plus existing business workflows and the notification flow in both engines at all four sizes. There were no failed tests in this run.
- Production container smoke checks passed before and after recreating PostgreSQL/backend/frontend: Flyway V1–V8, Nginx routing/configuration, notification creation/read state, unchanged read timestamp, recipient isolation, avatar byte integrity, deep links, mobile/desktop rendering and static cache headers. No fixture data was written to the application database.
- Firefox is currently blocked before page launch by a Windows side-by-side error for the bundled `mozglue` assembly. Reinstalling the same Playwright Firefox 1555 build did not resolve it. This is an environment limitation, not a Firefox application pass.

Runtime reports are ignored artifacts: `backend/target/site/jacoco/`, `frontend/coverage/`, `frontend/playwright-report/` and `frontend/test-results/`. A finite viewport matrix cannot prove every possible width/height or real-device behavior. Hosted CI has not been run by this task.

## Local deployment

Historical V8 release record: the local stack subsequently advanced through V10. See [the résumé release](RESUME_VERSIONS.md#local-deployment) for the current images, fresh V9 backup and preservation checks.

On 2026-10-24 the tested production images were deployed locally at http://localhost:4200 (API 8080, pgAdmin 5050). Flyway V1–V8 succeeded on PostgreSQL 17.10. All **20 pre-existing tables** retained identical counts and content fingerprints. The preserved records include 3 users, 20 jobs and the existing employer/candidate profiles. No application-database test accounts or notifications were fabricated.

Fresh recovery files are outside the checkout:

```text
C:\projects\Fullstack-job-seeker-clone-backups\20261024-152702-v7
```

The 50,083-byte V7 database dump was restored into a separate PostgreSQL container and all original table fingerprints matched. The 123-byte uploads archive and 156,964,352-byte V7 image archive are included with SHA-256 hashes, private configuration, before/after fingerprints and `RECOVERY.md`. The uploads volume was empty. Restore-check containers were removed without deleting volumes. The recovery Compose file was validated; a full recovery-stack cutover was not performed. This folder contains private data and must stay outside Git.

Deployed backend image: `sha256:0ea44e24e1b5e766116c1df5cdff32a666e9b243707bf6309e0465c8c068ca35`; frontend: `sha256:09ec1e2b69d29af1976d8fbdb4cf9ba25cbf24976bc8e0e64ac7206a39815593`. These are the same image IDs used in isolated production smoke tests. Read-only local checks passed for preserved jobs, current OpenAPI paths, unauthenticated API rejection, desktop/mobile deep-link reloads and protected UI routing. Local logs are in `frontend/tmp/notifications-local-release.log`.

Docker Desktop was restarted after the pause. Its stale runtime socket folders were renamed for recovery, with no factory reset or application-volume deletion. The recurring host socket issue may need separate troubleshooting if it returns. No dependency upgrade, commit, push or cloud deployment was performed for this feature.

## File ownership

- `backend/.../domain/model/Notification.java`, `application/model/NotificationModels.java`, `application/port/NotificationPort.java`: public model and focused persistence contract.
- `backend/.../application/usecase/notification/`: inbox operations and atomic event publishing; existing application/hiring/interview use cases invoke the publisher.
- `backend/.../infrastructure/persistence/adapter/JdbcNotificationAdapter.java`, `resources/db/migration/V8__in_app_notifications.sql`: recipient-scoped SQL and additive schema.
- `backend/.../interfaces/rest/NotificationController.java`, `InterviewController.java`: documented inbox and owned detail APIs.
- `frontend/src/app/core/notifications/`, `features/notifications/`, `data/notification.repository.ts`, `domain/notification*`: badge, inbox, state, transport and safe links; DI bindings and authenticated route register the feature.
- Existing applicant/application/interview screens and interview repository: open exact linked records. Navbar: notification access and compact mobile controls.
- Corresponding unit/integration specs and `frontend/e2e/notifications.spec.ts`: contract, business, UI and browser regression coverage.
