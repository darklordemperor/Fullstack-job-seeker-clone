# Candidate workspace release — 2026-10-23

## Delivered behavior

- **Saved jobs:** `/job-seeker/saved-jobs`, linked from the profile, account menu and mobile navigation. Eight summaries per page, newest saved first. Active jobs link to their details; closed and unavailable jobs remain removable. Loading, retry, empty and removal-error states are explicit. Removing the final item on a page loads the previous valid page. Pending removal prevents duplicate writes.
- **Work experience:** the profile drawer supports adding, editing and removing roles, company, title, dates and achievements. Company/title are required and capped at 180 characters, with at most 100 entries. Dates remain optional for compatibility; end dates cannot precede start dates. Cancellation discards the draft. Save failures keep edits visible; successful saves close the drawer. Pending saves disable editing and duplicate submissions.
- **Architecture:** compact saved-job application result and focused `CandidateWorkspacePort`; JDBC projection inside the existing adapter; thin controller. Frontend domain validation and `SaveProfileUseCase` remain independent of Angular. SignalStores own async UI workflows and repository contracts are resolved through DI tokens.
- No production dependencies, database migrations or new test frameworks were required. Existing API paths remain compatible.

## API contract

Previously, `GET /api/job-seeker/saved-jobs` returned a UUID array. It still does. The new `GET /api/job-seeker/saved-jobs/page?page=0&size=8` adds a separate compact summary response:

```json
{
  "success": true,
  "message": "Saved jobs loaded",
  "data": {
    "content": [{
      "jobId": "11111111-1111-4111-8111-111111111111",
      "title": "Product Engineer",
      "companyName": "Example Company",
      "location": "Bangkok",
      "status": "ACTIVE",
      "savedAt": "2026-10-23T03:00:00Z"
    }],
    "totalElements": 1,
    "totalPages": 1,
    "page": 0
  }
}
```

`ROLE_JOB_SEEKER` is required; identity comes from the access token. Negative pages become zero; size is clamped to 1–50. Sorting uses `saved_at DESC, job_id ASC` for deterministic ties. Empty results have `content: []`, `totalElements: 0`, `totalPages: 1`. Two SQL queries serve a page (count plus joined summaries), with no per-job queries. The existing user/date index supports saved-job lookup. Descriptions, employer/user IDs and application details are omitted. `location` can be null. Draft jobs return title `Job unavailable`, empty company name and null location; deleted jobs disappear through the existing foreign-key cascade.

`PUT /api/job-seeker/profile` keeps its existing full-profile request/response shape. Its `workExperiences` field is replaced as a list; an empty list removes all roles. Each entry accepts:

```json
{
  "company": "Example Company",
  "title": "Product Engineer",
  "startDate": "2022-01-10",
  "endDate": null,
  "description": "Built and maintained customer-facing applications."
}
```

Company/title limits now match the existing database columns. Invalid dates, blank names, excessive lengths and reversed date ranges return HTTP 400 through the existing error envelope. Ongoing roles can omit endDate; legacy entries may omit both dates. These updates never rewrite submitted application snapshots. OpenAPI descriptions and request validation annotations document the rules.

## Changed implementation paths

Paths below are relative to the repository root.

| File | Purpose |
| --- | --- |
| `backend/src/main/java/com/darklordempeor/jobsdb/application/model/HiringModels.java` | Add compact `SavedJob` result. |
| `backend/src/main/java/com/darklordempeor/jobsdb/application/port/CandidateWorkspacePort.java` | Add paginated saved-summary query contract. |
| `backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/jobseeker/CandidateWorkspaceUseCase.java` | Normalize pagination and preserve caller identity. |
| `backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/persistence/adapter/JdbcCandidateWorkspaceAdapter.java` | Count/query summaries with stable ordering and draft redaction. |
| `backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/HiringController.java` | Expose/document the additive endpoint. |
| `backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/request/WorkExperienceRequest.java` | Validate field lengths/date ordering and document optional dates. |
| `backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/JobSeekerController.java` | Document profile replacement, validation and snapshot behavior. |
| `frontend/src/app/domain/saved-job.model.ts` | Typed compact saved-job contract. |
| `frontend/src/app/domain/repositories/job-seeker.repository.port.ts` | Add paginated repository method. |
| `frontend/src/app/data/job-seeker.repository.ts` | Map the new HTTP envelope to domain pagination. |
| `frontend/src/app/domain/work-experience.rules.ts` | Pure work-history validation. |
| `frontend/src/app/application/use-cases/save-profile.use-case.ts` | Validate/normalize experience before persistence. |
| `frontend/src/app/core/di/use-case.tokens.ts` | Compose the profile use case from its repository port. |
| `frontend/src/app/features/job-seeker/saved-jobs/saved-jobs.store.ts` | Paging, retry, removal, duplicate-write guard and stale-load protection. |
| `frontend/src/app/features/job-seeker/saved-jobs/saved-jobs.component.ts` | Responsive shortlist page and accessible status/error states. Scoped link colors preserve contrast against the existing global anchor reset. |
| `frontend/src/app/features/job-seeker/profile/work-experience-editor.component.ts` | Reusable controlled editor with labeled fields and role removal. |
| `frontend/src/app/features/job-seeker/profile/profile.component.ts` | Integrate the drawer, saved-jobs navigation and recoverable save behavior. |
| `frontend/src/app/features/job-seeker/profile/profile.store.ts` | Confirm save success before closing; retain errors and saved profile on failure. |
| `frontend/src/app/features/job-seeker/job-seeker.routes.ts` | Lazy saved-jobs route under the existing role guard. |
| `frontend/src/app/core/layout/navbar/navbar.component.ts` | Candidate account/mobile links. |

Tests were added or updated in `CandidateWorkspaceUseCaseTest.java`, `HiringIntegrationTest.java`, `save-profile.use-case.spec.ts`, `repositories.spec.ts`, `profile.store.spec.ts`, `work-experience.component.spec.ts`, `saved-jobs.store.spec.ts`, `saved-jobs.component.spec.ts`, `frontend/e2e/candidate-workspace-workflows.spec.ts` and `frontend/e2e/responsive.spec.ts`. README, implementation summary and hiring contracts describe the delivered behavior.

## Validation

- Backend `mvnw.cmd verify` with `JOBSDB_INTEGRATION_TESTS=true`: **90 tests passed**, including **17 isolated PostgreSQL integration cases**; no skips/failures. Per-class business coverage gates passed. Local PostgreSQL version: 18.4, database `jobsdb_test`, port 55437. CI targets PostgreSQL 17.
- Frontend `npm test -- --watch=false`: **89 tests passed across 23 files**.
- Frontend production build, architecture checks and E2E TypeScript check passed.
- Browser command `npm run test:e2e -- --project=chromium --project=webkit`: **74 passed** (65 Chromium, 9 WebKit), no failures. This includes **252 route/viewport combinations** (18 routes × 14 sizes), seven profile drawers including work experience, existing hiring/admin/auth flows, and eight candidate-workspace workflow cases across both engines.
- Populated saved lists and experience editing passed at 320×568, 768×1024, 844×390 and 1440×900 in both engines. Screenshot review covered phone/desktop saved-job layouts and phone/landscape experience drawers. The review caught and verified the fix for link contrast.
- `git diff --check` passed. Firefox and branded Google Chrome were not run in this release; Chromium is the bundled Playwright browser. This matrix does not prove every possible viewport or real-device keyboard.
- Reports: `backend/target/site/jacoco/index.html`, `backend/target/candidate-workspace-verify.log`, `frontend/playwright-report/index.html`, `frontend/test-results/results.json`, screenshots under `frontend/test-results/`, and `frontend/test-results/candidate-e2e.log`. Runtime artifacts are ignored. Test servers and the isolated PostgreSQL instance were stopped after verification.

## Scope boundaries

This release completes the saved-jobs page and work experience editor. Managed résumé upload/versioning, interview scheduling, notification delivery, scorecards, alerts and analytics remain separate future features. No commit, push, deployment or GitHub Actions run is included. Existing Firefox availability and production Docker verification gaps are not resolved by this release.
