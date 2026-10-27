# Implementation summary — 2026-10-22

> Latest delivery: [interview lifecycle and measured frontend coverage](INTERVIEW_LIFECYCLE_AND_COVERAGE.md). This document preserves the earlier implementation baseline; the initial [interview scheduling release](INTERVIEW_SCHEDULING.md) retains its separate verification evidence.

The subsequent approved backend/frontend architecture cleanup and its **51 backend / 41 frontend** test results are documented in [Clean Architecture implementation](CLEAN_ARCHITECTURE.md). The verification table below records the earlier feature-delivery run.

Applied in the existing monorepo checkout, with no dependency upgrades, production dependencies, commits, pushes, or deployment. The Spring/Angular architecture and PostgreSQL 17 deployment target remain in place.

## Improvements delivered

1. Real employer hiring workflow: owned-job applicants, pagination/stage filtering, submitted-profile snapshots, private review notes, controlled status moves, concurrency checks, and actual dashboard counts.
2. Reliable authentication: purpose-bound access/refresh tokens, hashed stored refresh tokens, single-use rotation, logout revocation, shared frontend refresh requests, and consistent 401/403 responses.
3. Persistent candidate/company features: company details, contact preferences, apply/save state, and candidate-visible application history.
4. Truthful frontend behavior: live failures remain errors, empty results stay empty, sample mode is explicit and disabled by default, filter state is in the URL, and placeholder controls/copy are removed.
5. Bounded admin lists, preserved moderation reasons, typed payloads, batched job enrichment, validation, and additive Flyway V5.
6. Regression tests, PostgreSQL-backed API tests, OpenAPI descriptions, a PostgreSQL 17 CI workflow, Docker development routing, and updated contributor/user documentation.

## Verification evidence

| Check | Result |
| --- | --- |
| Maven complete suite with JOBSDB_INTEGRATION_TESTS=true | **44 tests passed**, 0 failures/errors/skips; includes 8 database/API integration tests |
| Angular Vitest/JSDOM suite | **29 tests passed** across 10 files |
| Angular production build | Passed |
| Production-like Compose configuration | Passed |
| Development Compose configuration | Passed |
| git diff --check | Passed |
| Local browser smoke check | Home search retained keyword/location, employer login succeeded, dashboard showed real counts, applicant snapshot rendered, SUBMITTED → REVIEWING persisted and appeared in history |
| Narrow browser layout | Search/list and applicant review inspected; search field contrast corrected |
| Search diagnostic | Executed on 20,000 temporary rows; current substring behavior retained |
| GitHub-hosted CI / full Docker stack | Not run here; Docker engine unavailable |

Integration checks used an isolated PostgreSQL **18.4** cluster on 127.0.0.1:55437 with the database name jobsdb_test. This verifies real SQL/Flyway/transaction behavior locally, but does not replace the PostgreSQL **17** job configured in CI. No user application database or Docker volumes were reset.

The local JDK 21 Windows selector could not connect its internal Unix-domain socket. MockMvc exercises the actual security/controller/service/database stack without a listening HTTP socket. Browser checks used a process-local `jdk.net.unixdomain.tmpdir` override pointing to a nonexistent directory, causing the JDK's built-in TCP fallback. No JVM workaround was added to project configuration.

Generated local evidence is under ignored `backend/target/`: `verification.log`, `frontend-test-verification.log`, `frontend-build-verification.log`, and `hiring-browser-check.png`. These are local artifacts, not committed test fixtures. Browser checks are a focused smoke test, not a complete desktop/mobile E2E suite.

## Candidate workspace follow-up

Saved jobs now have a dedicated paginated screen, including removal and unavailable-job states. Work experience can be added, edited and removed from the profile drawer. See the [candidate workspace release](CANDIDATE_WORKSPACE_RELEASE.md) for the files, contracts and latest verification.

## Remaining boundaries

- New applications preserve profile JSON and URL strings, not externally linked résumé/avatar file bytes.
- Historical applications have no fabricated snapshot.
- Discovery and recommendation-delivery preferences persist, but the corresponding services do not exist yet.
- Existing legacy lists and employer job lists remain unpaged for compatibility; new applicant/candidate/admin views use the paged APIs.
- Sessions retain localStorage. Cross-tab refresh coordination, HttpOnly cookie transport, rate limiting, and scheduled token cleanup remain separate improvements.
- Full-text search was evaluated but not enabled because its matching behavior differs for partial words and Thai text.
- Generated OpenAPI clients are not configured.
- CI execution against PostgreSQL 17 and a full container smoke test remain to be observed where Docker runs.

See [Hiring workflows](HIRING_WORKFLOWS.md) for complete endpoint contracts, examples, migration/rollback notes, and reproduction commands.

## Changed-file guide

Paths below are repository-relative and link to each exact file.

| File | Why it changes |
| --- | --- |
| [`.github/workflows/verify.yml`](../.github/workflows/verify.yml) | Run PostgreSQL 17 integration tests, frontend tests/build, and Compose checks. |
| [`.gitignore`](../.gitignore) | Ignore runtime backend uploads. |
| [`AGENTS.md`](../AGENTS.md) | Replace stale contributor caveats with current workflow and test constraints. |
| [`README.md`](../README.md) | Describe implemented features, V5, container proxy routing, and verification. |
| [`backend/scripts/evaluate-search.sql`](../backend/scripts/evaluate-search.sql) | Provide a repeatable, temporary-data search diagnostic. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/application/model/HiringModels.java`](../backend/src/main/java/com/darklordempeor/jobsdb/application/model/HiringModels.java) | Define typed, compact hiring projections and profile snapshots. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/application/port/ApplicationWorkflowPort.java`](../backend/src/main/java/com/darklordempeor/jobsdb/application/port/ApplicationWorkflowPort.java) | Hiring persistence contract; the original aggregate HiringPort was split into focused ports during the architecture cleanup. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/application/port/JobSummaryPort.java`](../backend/src/main/java/com/darklordempeor/jobsdb/application/port/JobSummaryPort.java) | Expose batched company/count enrichment without coupling controllers to SQL. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/application/port/JwtPort.java`](../backend/src/main/java/com/darklordempeor/jobsdb/application/port/JwtPort.java) | Expose refresh consumption and revocation through the existing auth port. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/admin/AdminUseCase.java`](../backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/admin/AdminUseCase.java) | Write moderation audit reasons and expose bounded admin pages. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/auth/AuthUseCase.java`](../backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/auth/AuthUseCase.java) | Issue real rotated token pairs and implement logout revocation. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/employer/EmployerUseCase.java`](../backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/employer/EmployerUseCase.java) | Persist typed company settings and report ownership failures correctly. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/employer/HiringUseCase.java`](../backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/employer/HiringUseCase.java) | Enforce applicant ownership, transitions, paging, and private workspace operations. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/employer/JobQueryUseCase.java`](../backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/employer/JobQueryUseCase.java) | Hide non-active jobs from public detail access. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/jobseeker/ApplicationUseCase.java`](../backend/src/main/java/com/darklordempeor/jobsdb/application/usecase/jobseeker/ApplicationUseCase.java) | Require an active job, reject duplicates, and capture submission in the same transaction. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/domain/exception/ConflictException.java`](../backend/src/main/java/com/darklordempeor/jobsdb/domain/exception/ConflictException.java) | Represent duplicate/stale workflow conflicts independently of HTTP. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/domain/exception/ForbiddenException.java`](../backend/src/main/java/com/darklordempeor/jobsdb/domain/exception/ForbiddenException.java) | Represent ownership/permission failures independently of HTTP. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/domain/exception/UnauthorizedException.java`](../backend/src/main/java/com/darklordempeor/jobsdb/domain/exception/UnauthorizedException.java) | Represent authentication failures independently of HTTP. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/domain/service/ApplicationTransitions.java`](../backend/src/main/java/com/darklordempeor/jobsdb/domain/service/ApplicationTransitions.java) | Keep the hiring state machine Spring-free and testable. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/persistence/adapter/ApplicationRepositoryAdapter.java`](../backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/persistence/adapter/ApplicationRepositoryAdapter.java) | Flush the JPA application insert before JDBC captures its snapshot. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/persistence/adapter/JdbcApplicationWorkflowAdapter.java`](../backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/persistence/adapter/JdbcApplicationWorkflowAdapter.java) | Persist snapshots/events and query applications; company, settings, saved jobs, admin queries and audit writes now have separate adapters. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/persistence/adapter/JdbcJobSummaryAdapter.java`](../backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/persistence/adapter/JdbcJobSummaryAdapter.java) | Enrich job responses using one batched query per list. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/persistence/repository/JpaJobRepository.java`](../backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/persistence/repository/JpaJobRepository.java) | Add an ID tie-breaker for deterministic public paging. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/persistence/repository/JpaRefreshTokenRepository.java`](../backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/persistence/repository/JpaRefreshTokenRepository.java) | Atomically consume a still-valid refresh token. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/security/JwtService.java`](../backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/security/JwtService.java) | Separate token purposes, persist hashes, and rotate/revoke refresh tokens. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/security/SecurityConfig.java`](../backend/src/main/java/com/darklordempeor/jobsdb/infrastructure/security/SecurityConfig.java) | Return consistent API envelopes for authentication/authorization failures. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/advice/GlobalExceptionHandler.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/advice/GlobalExceptionHandler.java) | Map validation, malformed input, auth, ownership, and conflict failures. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/request/ApplicationStatusRequest.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/request/ApplicationStatusRequest.java) | Require expected/current target status and a bounded nonblank reason. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/request/EmployerProfileRequest.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/request/EmployerProfileRequest.java) | Validate company details before persistence. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/request/JobRequest.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/request/JobRequest.java) | Validate field bounds, salary range, and currency. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/request/JobSeekerProfileRequest.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/request/JobSeekerProfileRequest.java) | Validate nested collections, salary range, and résumé URL protocol. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/request/SettingsRequest.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/request/SettingsRequest.java) | Validate persisted contact settings. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/response/JobResponse.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/dto/response/JobResponse.java) | Add company name and applicant count without removing existing job fields. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/mapper/JobMapper.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/mapper/JobMapper.java) | Keep the existing mapper compatible with additive response fields. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/mapper/JobResponseAssembler.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/mapper/JobResponseAssembler.java) | Map enriched application results to HTTP responses; enrichment now belongs to application JobEnrichment. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/AdminController.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/AdminController.java) | Expose additive paged admin APIs and pass the actor into deletion audit. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/ApplicationsController.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/ApplicationsController.java) | Return useful candidate application summaries while retaining the existing envelope. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/AuthController.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/AuthController.java) | Expose logout and document refresh/logout behavior. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/EmployerController.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/EmployerController.java) | Return persisted company details and enriched owned jobs; remove placeholder applicants. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/HiringController.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/HiringController.java) | Expose and document paged applicants, snapshots, transitions, settings, and saved-job APIs. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/JobSeekerController.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/JobSeekerController.java) | Serialize profile responses through the typed profile contract. |
| [`backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/JobsController.java`](../backend/src/main/java/com/darklordempeor/jobsdb/interfaces/rest/JobsController.java) | Use enriched responses and document active-only public search/detail behavior. |
| [`backend/src/main/resources/db/migration/V5__hiring_workflows.sql`](../backend/src/main/resources/db/migration/V5__hiring_workflows.sql) | Add workflow tables, foreign keys, uniqueness, and query indexes. |
| [`backend/src/test/java/com/darklordempeor/jobsdb/application/usecase/admin/AdminUseCaseTest.java`](../backend/src/test/java/com/darklordempeor/jobsdb/application/usecase/admin/AdminUseCaseTest.java) | Add or update regression coverage for the changed behavior and its error paths. |
| [`backend/src/test/java/com/darklordempeor/jobsdb/application/usecase/auth/AuthUseCaseTest.java`](../backend/src/test/java/com/darklordempeor/jobsdb/application/usecase/auth/AuthUseCaseTest.java) | Add or update regression coverage for the changed behavior and its error paths. |
| [`backend/src/test/java/com/darklordempeor/jobsdb/application/usecase/employer/EmployerUseCaseTest.java`](../backend/src/test/java/com/darklordempeor/jobsdb/application/usecase/employer/EmployerUseCaseTest.java) | Add or update regression coverage for the changed behavior and its error paths. |
| [`backend/src/test/java/com/darklordempeor/jobsdb/application/usecase/employer/HiringUseCaseTest.java`](../backend/src/test/java/com/darklordempeor/jobsdb/application/usecase/employer/HiringUseCaseTest.java) | Add or update regression coverage for the changed behavior and its error paths. |
| [`backend/src/test/java/com/darklordempeor/jobsdb/application/usecase/jobseeker/ApplicationUseCaseTest.java`](../backend/src/test/java/com/darklordempeor/jobsdb/application/usecase/jobseeker/ApplicationUseCaseTest.java) | Add or update regression coverage for the changed behavior and its error paths. |
| [`backend/src/test/java/com/darklordempeor/jobsdb/infrastructure/security/JwtServiceTest.java`](../backend/src/test/java/com/darklordempeor/jobsdb/infrastructure/security/JwtServiceTest.java) | Add or update regression coverage for the changed behavior and its error paths. |
| [`backend/src/test/java/com/darklordempeor/jobsdb/integration/HiringIntegrationTest.java`](../backend/src/test/java/com/darklordempeor/jobsdb/integration/HiringIntegrationTest.java) | Add or update regression coverage for the changed behavior and its error paths. |
| [`contracts/HIRING_WORKFLOWS.md`](../contracts/HIRING_WORKFLOWS.md) | Document API shapes, auth, migration, limitations, and verification. |
| [`contracts/README.md`](../contracts/README.md) | Index API and implementation documentation. |
| [`docker-compose.dev.yml`](../docker-compose.dev.yml) | Use the Docker-network Angular proxy. |
| [`frontend/proxy.docker.conf.json`](../frontend/proxy.docker.conf.json) | Route API/uploads to the backend container instead of container-local localhost. |
| [`frontend/src/app/app.config.ts`](../frontend/src/app/app.config.ts) | Order interceptors so failed refresh retries produce the final error notification. |
| [`frontend/src/app/app.spec.ts`](../frontend/src/app/app.spec.ts) | Add or update regression coverage for the changed behavior and its error paths. |
| [`frontend/src/app/core/auth/auth.store.ts`](../frontend/src/app/core/auth/auth.store.ts) | Derive roles from real sessions, use shared refresh state, and revoke on logout. |
| [`frontend/src/app/core/auth/session.service.ts`](../frontend/src/app/core/auth/session.service.ts) | Own session restoration and shared refresh requests; reject legacy demo sessions. |
| [`frontend/src/app/core/http/jwt.interceptor.spec.ts`](../frontend/src/app/core/http/jwt.interceptor.spec.ts) | Add or update regression coverage for the changed behavior and its error paths. |
| [`frontend/src/app/core/http/jwt.interceptor.ts`](../frontend/src/app/core/http/jwt.interceptor.ts) | Attach credentials only to local API paths and refresh/retry once. |
| [`frontend/src/app/core/layout/footer/footer.component.ts`](../frontend/src/app/core/layout/footer/footer.component.ts) | Replace framework scaffold text with portfolio/product copy. |
| [`frontend/src/app/core/layout/navbar/navbar.component.ts`](../frontend/src/app/core/layout/navbar/navbar.component.ts) | Use accurate profile guidance in the announcement. |
| [`frontend/src/app/data/admin.repository.ts`](../frontend/src/app/data/admin.repository.ts) | Remove silent success fallbacks and request server-side pages. |
| [`frontend/src/app/data/auth.repository.ts`](../frontend/src/app/data/auth.repository.ts) | Call the logout revocation API. |
| [`frontend/src/app/data/employer.repository.ts`](../frontend/src/app/data/employer.repository.ts) | Load real counts/applicants/details and persist workflow transitions. |
| [`frontend/src/app/data/job-seeker.repository.ts`](../frontend/src/app/data/job-seeker.repository.ts) | Load/persist settings, saved state, and application history without fallback data. |
| [`frontend/src/app/data/job.repository.ts`](../frontend/src/app/data/job.repository.ts) | Preserve real empty/error states; sample data only in explicit preview mode. |
| [`frontend/src/app/data/repositories.spec.ts`](../frontend/src/app/data/repositories.spec.ts) | Add or update regression coverage for the changed behavior and its error paths. |
| [`frontend/src/app/domain/hiring.model.ts`](../frontend/src/app/domain/hiring.model.ts) | Type workflow details, status history, dashboard counts, and settings. |
| [`frontend/src/app/features/admin/applications/applications.component.spec.ts`](../frontend/src/app/features/admin/applications/applications.component.spec.ts) | Add or update regression coverage for the changed behavior and its error paths. |
| [`frontend/src/app/features/admin/applications/applications.component.ts`](../frontend/src/app/features/admin/applications/applications.component.ts) | Use server-side moderation pages and preserve records after failed deletions. |
| [`frontend/src/app/features/admin/dashboard/dashboard.component.ts`](../frontend/src/app/features/admin/dashboard/dashboard.component.ts) | Show failures and retry instead of an empty dashboard. |
| [`frontend/src/app/features/admin/users/users.component.ts`](../frontend/src/app/features/admin/users/users.component.ts) | Use bounded API pages with loading/error/retry states. |
| [`frontend/src/app/features/auth/login/login.component.ts`](../frontend/src/app/features/auth/login/login.component.ts) | Remove prefilled credentials and gate demo-role controls. |
| [`frontend/src/app/features/employer/applicants/applicants.component.spec.ts`](../frontend/src/app/features/employer/applicants/applicants.component.spec.ts) | Add or update regression coverage for the changed behavior and its error paths. |
| [`frontend/src/app/features/employer/applicants/applicants.component.ts`](../frontend/src/app/features/employer/applicants/applicants.component.ts) | Build the real applicant review, snapshot, history, filter, and stage-update UI. |
| [`frontend/src/app/features/employer/dashboard/dashboard.component.ts`](../frontend/src/app/features/employer/dashboard/dashboard.component.ts) | Replace fabricated metrics with owned-job/application counts. |
| [`frontend/src/app/features/employer/manage-jobs/manage-jobs.component.ts`](../frontend/src/app/features/employer/manage-jobs/manage-jobs.component.ts) | Distinguish loading, no jobs, and load failure. |
| [`frontend/src/app/features/employer/settings/settings.component.ts`](../frontend/src/app/features/employer/settings/settings.component.ts) | Load and save the actual company profile with pending/error states. |
| [`frontend/src/app/features/home/home.component.spec.ts`](../frontend/src/app/features/home/home.component.spec.ts) | Add or update regression coverage for the changed behavior and its error paths. |
| [`frontend/src/app/features/home/home.component.ts`](../frontend/src/app/features/home/home.component.ts) | Submit keyword/location search, improve field contrast, and remove placeholder claims. |
| [`frontend/src/app/features/job-seeker/my-applications/my-applications.component.ts`](../frontend/src/app/features/job-seeker/my-applications/my-applications.component.ts) | Show paged applications and candidate-visible status history. |
| [`frontend/src/app/features/job-seeker/settings/settings.component.spec.ts`](../frontend/src/app/features/job-seeker/settings/settings.component.spec.ts) | Add or update regression coverage for the changed behavior and its error paths. |
| [`frontend/src/app/features/job-seeker/settings/settings.component.ts`](../frontend/src/app/features/job-seeker/settings/settings.component.ts) | Persist contact preferences and label unavailable features honestly. |
| [`frontend/src/app/features/jobs/job-actions.component.spec.ts`](../frontend/src/app/features/jobs/job-actions.component.spec.ts) | Add or update regression coverage for the changed behavior and its error paths. |
| [`frontend/src/app/features/jobs/job-actions.component.ts`](../frontend/src/app/features/jobs/job-actions.component.ts) | Share real Apply/Save state and prevent repeated pending submissions. |
| [`frontend/src/app/features/jobs/job-detail/job-detail.component.ts`](../frontend/src/app/features/jobs/job-detail/job-detail.component.ts) | Load the requested job with not-found/error/retry and real actions. |
| [`frontend/src/app/features/jobs/job-list/job-filter/job-filter.component.ts`](../frontend/src/app/features/jobs/job-list/job-filter/job-filter.component.ts) | Sync form inputs from active filters and remove unsupported filter chips. |
| [`frontend/src/app/features/jobs/job-list/job-list.component.ts`](../frontend/src/app/features/jobs/job-list/job-list.component.ts) | Synchronize filters with URL, show real actions, and remove fabricated metadata. |
| [`frontend/src/app/features/jobs/job-list/job-list.store.ts`](../frontend/src/app/features/jobs/job-list/job-list.store.ts) | Clear stale results and selection after failed loads. |
| [`frontend/src/app/shared/ui/pagination/pagination.component.spec.ts`](../frontend/src/app/shared/ui/pagination/pagination.component.spec.ts) | Add or update regression coverage for the changed behavior and its error paths. |
| [`frontend/src/app/shared/ui/pagination/pagination.component.ts`](../frontend/src/app/shared/ui/pagination/pagination.component.ts) | Bound the page-button window and identify the current page accessibly. |
| [`frontend/src/environments/environment.prod.ts`](../frontend/src/environments/environment.prod.ts) | Disable sample mode for production builds. |
| [`frontend/src/environments/environment.ts`](../frontend/src/environments/environment.ts) | Disable sample mode for normal local operation. |
| [`contracts/IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md) | Record implementation, evidence, and remaining limits. |
