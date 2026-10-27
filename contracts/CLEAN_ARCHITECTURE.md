# Clean Architecture implementation — 2026-10-23

The approved cleanup covers both applications. It changes dependency boundaries while preserving endpoint URLs, request/response JSON, validation, authorization, database schema, and transaction behavior. No dependencies were added or upgraded.

## What belongs in each layer

| Concept | Backend | Frontend |
| --- | --- | --- |
| Entity / domain model | Pure Java records in `domain/model`; distinct from JPA entities | TypeScript interfaces in `domain`; no Angular dependencies |
| Business rule | `domain/service/ApplicationTransitions` | `domain/application-transitions.ts` supplies UI eligibility; the backend remains authoritative |
| Use case | `application/usecase`: authorization and workflow orchestration | `application/use-cases/ReviewApplicantUseCase`: validates and submits a review command |
| Repository interface / port | `domain/repository` for aggregates, `application/port` for workflow queries and external services | `domain/repositories/*.repository.port.ts` |
| Repository implementation | JPA/JDBC adapters in `infrastructure/persistence/adapter` | HTTP adapters in `data/*.repository.ts` |
| Presentation | Controllers, validated HTTP DTOs and pure mappers in `interfaces` | Standalone components, SignalStores, route/auth integration |
| Dependency wiring | Spring constructor injection binds adapters to interfaces | `core/di/repository.providers.ts` binds Angular tokens to HTTP implementations |

The critical rule is dependency direction, not folder names: application/domain code must not depend on controllers, HTTP DTOs, Angular components, or concrete persistence/HTTP adapters.

## Backend request flow

For a profile update:

1. `JobSeekerController` receives and validates `JobSeekerProfileRequest`.
2. `ApiCommandMapper` maps it to `JobSeekerProfileCommand`, including nested skills, employment, education, languages and licenses.
3. `JobSeekerUseCase` calls `JobSeekerProfilePort`.
4. `JdbcJobSeekerProfileAdapter` implements that port, persists the fields and returns a typed `HiringModels.Profile`.
5. The controller wraps the result in the existing `ApiResponse` envelope. JDBC maps never escape the adapter.

The HTTP payload before and after is identical: salary input remains `expectedSalaryMin`, `expectedSalaryMax`, `salaryCurrency`; the response retains `expectedSalary: { min, max, currency }`. Controller validation and OpenAPI schemas remain attached to the existing HTTP request types.

Job creation/update/status and public listings now enrich results in the application layer through `JobEnrichment`. It batches company/application-count queries through `JobSummaryPort` and skips the query for empty lists. `JobResponseAssembler` only maps already-loaded values. Public pagination normalization and metadata assembly moved into `JobQueryUseCase.browse`.

The former aggregate hiring persistence port/adapter was split into:

| Interface | Implementation | Responsibility |
| --- | --- | --- |
| `CompanyPort` | `JdbcCompanyAdapter` | Employer company profile |
| `ApplicationWorkflowPort` | `JdbcApplicationWorkflowAdapter` | Applicant queries, snapshots, status events and employer statistics |
| `CandidateWorkspacePort` | `JdbcCandidateWorkspaceAdapter` | Preferences, saved jobs and apply/save state |
| `AdminQueryPort` | `JdbcAdminQueryAdapter` | Paged administrative projections |
| `AuditPort` | `JdbcAuditAdapter` | Moderation audit writes |
| `PasswordHashPort` | `PasswordHashAdapter` | Password hashing and verification through the existing Spring encoder |

`ApplicationRows` shares the application query/row mapping between JDBC adapters. `CandidateWorkspaceUseCase` owns saved-job eligibility and settings operations. Admin legacy list endpoints now call `AdminUseCase`; controllers no longer inject repository ports. Existing transactional application submission, snapshots/events, status updates, and moderation writes still use the same database transactions.

## Frontend request flow

For an applicant status change:

1. `ApplicantsComponent` owns form input and delegates the action to `ApplicantsStore`.
2. The store handles selection, loading/saving state, feedback and subsequent refreshes.
3. `ReviewApplicantUseCase` validates the transition and trimmed note, then calls `EmployerRepositoryPort.moveApplicant` with the expected current status.
4. The injected `EmployerRepository` implements the contract and sends the existing PATCH request.
5. The backend enforces ownership, transition rules and concurrent-update checks. Failures propagate instead of becoming fabricated success responses.

The store ignores stale list/detail responses, invalidates pending detail requests on filter changes, prevents duplicate saves, preserves a newer applicant selection while an earlier save completes, and ignores late results after destruction. Simple reads elsewhere can use repository contracts directly; they do not need a forwarding use-case class.

All feature and auth consumers now inject typed tokens instead of concrete HTTP repositories. `SessionService` still owns session state and shared in-flight refreshes; `SessionRepository` owns the refresh HTTP call and bypasses interceptors with `HttpBackend` to prevent refresh recursion. Existing refresh concurrency/security tests exercise the real DI bindings.

`data/dto/api-response.ts` owns the wire envelope, while `domain/page.model.ts` owns shared pagination. `toProfileRequest` explicitly selects writable fields, including nested lists: read-only `userId`/avatar fields and unknown response fields are not sent back in updates. Valid writable payload fields and API semantics remain unchanged.

## Exact file guide

Paths are relative to this repository. The backend Java prefix below is `backend/src/main/java/com/darklordempeor/jobsdb/`.

| Files under the Java prefix | Reason |
| --- | --- |
| `application/model/LoginCommand.java`, `RegisterCommand.java`, `JobCommand.java`, `EmployerProfileCommand.java`, `JobSeekerProfileCommand.java` | Application-owned inputs instead of HTTP request DTOs |
| `application/model/AuthTokens.java`, `AdminStats.java`, `JobView.java` | Application-owned output and enriched job projection |
| `application/port/CompanyPort.java`, `ApplicationWorkflowPort.java`, `CandidateWorkspacePort.java`, `AdminQueryPort.java`, `AuditPort.java`, `PasswordHashPort.java` | Focused contracts replacing aggregate persistence and concrete password dependencies |
| `application/port/JobSeekerProfilePort.java` | Typed profile input/output |
| `application/usecase/auth/AuthUseCase.java`, `admin/AdminUseCase.java`, `employer/EmployerUseCase.java`, `jobseeker/JobSeekerUseCase.java` | Use application models and focused dependencies; admin owns legacy list reads |
| `application/usecase/employer/HiringUseCase.java`, `jobseeker/ApplicationUseCase.java`, `jobseeker/CandidateWorkspaceUseCase.java` | Separate application workflow from candidate preferences/saved jobs |
| `application/usecase/employer/JobEnrichment.java`, `JobQueryUseCase.java` | Batch enrichment and public pagination orchestration |
| `infrastructure/persistence/adapter/JdbcCompanyAdapter.java`, `JdbcApplicationWorkflowAdapter.java`, `JdbcCandidateWorkspaceAdapter.java`, `JdbcAdminQueryAdapter.java`, `JdbcAuditAdapter.java`, `ApplicationRows.java` | Implement the focused persistence contracts and share application row mapping |
| `infrastructure/persistence/adapter/JdbcJobSeekerProfileAdapter.java` | Map database rows to typed profiles inside the persistence boundary |
| `infrastructure/security/PasswordHashAdapter.java` | Implement password hashing through the existing encoder |
| `interfaces/mapper/ApiCommandMapper.java`, `JobResponseAssembler.java` | Map transport inputs/results without querying persistence |
| `interfaces/rest/AuthController.java`, `AdminController.java`, `EmployerController.java`, `JobSeekerController.java`, `JobsController.java`, `HiringController.java` | Delegate to use cases and map commands/results while preserving routes and schemas |

The old uncommitted `application/port/HiringPort.java` and `infrastructure/persistence/adapter/JdbcHiringAdapter.java` are replaced by the focused files above.

| Frontend path | Reason |
| --- | --- |
| `frontend/src/app/domain/repositories/{admin,auth,employer,job,job-seeker,session}.repository.port.ts` | Repository contracts independent of Angular |
| `frontend/src/app/domain/auth.model.ts`, `page.model.ts`, `application-transitions.ts` | Shared inputs, pagination and transition eligibility |
| `frontend/src/app/application/use-cases/review-applicant.use-case.ts` | Framework-independent review operation |
| `frontend/src/app/core/di/repository.tokens.ts`, `repository.providers.ts`, `use-case.tokens.ts` | Type-safe composition and use-case construction |
| `frontend/src/app/app.config.ts` | Install live repository bindings |
| `frontend/src/app/core/auth/auth.store.ts`, `auth.service.ts`, `session.service.ts` | Consume contracts; remove refresh HTTP from session management |
| `frontend/src/app/data/{admin,auth,employer,job,job-seeker}.repository.ts` | Implement domain contracts and consume the data-owned envelope |
| `frontend/src/app/data/session.repository.ts`, `dto/api-response.ts`, `mappers/profile-request.mapper.ts` | Refresh transport, wire envelope and explicit writable profile mapping |
| `frontend/src/app/features/employer/applicants/applicants.component.ts`, `applicants.store.ts` | Separate form rendering from asynchronous workflow state |
| `frontend/src/app/features/admin/{users,applications,dashboard}/*.component.ts` | Replace concrete repository injection with the admin contract token |
| `frontend/src/app/features/employer/{settings,post-job,dashboard,manage-jobs}/*.component.ts` | Replace concrete repository injection with the employer contract token |
| `frontend/src/app/features/job-seeker/{my-applications,settings}/*.component.ts`, `profile/profile.store.ts` | Replace concrete repository injection with the candidate contract token |
| `frontend/src/app/features/jobs/job-actions.component.ts`, `job-detail/job-detail.component.ts`, `job-list/job-list.store.ts` | Replace concrete repository injection with contract tokens |
| `frontend/scripts/check-architecture.mjs`, `frontend/package.json` | Check source imports before tests/builds without another framework/dependency |

Existing use-case/component tests now supply application commands or contract tokens. Added tests cover command mapping, batched enrichment, candidate saved-job eligibility, review validation/conflicts, stale request state, duplicate writes, destruction and writable profile fields.

## Verification and deliberate limits

- Backend: **51 tests passed**, no failures/errors/skips, including **8 PostgreSQL/MockMvc integration tests** and the source architecture guard.
- Frontend: **41 tests passed** across **12 files**; architecture checks and production build passed.
- Database verification used the isolated `jobsdb_test` PostgreSQL **18.4** cluster on port **55437**. PostgreSQL **17** remains the Compose/CI target; hosted CI was not run in this session.
- API integration tests include existing contracts, authorization, transaction/concurrency behavior, refresh rotation and OpenAPI coverage. No migrations or endpoint schemas changed.
- No new browser E2E or visual verification was performed for this refactor. Component/store tests cover behavior; the previous feature smoke check is recorded separately in `IMPLEMENTATION_SUMMARY.md`.
- Domain models, application commands/results and ports are framework-free on the backend. Use cases deliberately keep Spring service/transaction annotations. Moving those annotations to external decorators is a separate architectural choice.
- Frontend domain/application layers have no Angular/NgRx imports. Repository interfaces use RxJS observables; this is not a library-free core. Browser uploads retain `File` in their contract.
- Source guards check common imports and fully qualified Java references; they supplement tests, not a full compiler-level dependency analysis.
- Generated OpenAPI clients are not configured. The current typed repository contracts and request mappers are handwritten and tested.

Reproduce on Linux:

```bash
cd backend
./mvnw test                       # integration tests are opt-in
# For full DB checks, configure an isolated jobsdb_test database as documented in HIRING_WORKFLOWS.md.
JOBSDB_INTEGRATION_TESTS=true ./mvnw test
cd ../frontend
npm run check:architecture
npm test -- --watch=false
npm run build
```

On Windows use `mvnw.cmd`, `npm.cmd`, and `$env:JOBSDB_INTEGRATION_TESTS='true'`. Evidence logs are ignored local artifacts under `backend/target/architecture-{verification,frontend,build}.log`.
