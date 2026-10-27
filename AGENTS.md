# Agent Notes

This repository is a full-stack JobsDB clone monorepo. Keep the root clean and put app-specific files inside their owning app folder.

## Root Layout

- `backend/` - Spring Boot REST API.
- `frontend/` - Angular web app.
- `contracts/` - shared API contract notes, request/response examples, and future generated clients.
- `docker-compose.yml` - production-like local stack.
- `docker-compose.dev.yml` - hot-reload development overrides.
- `.env.example` - safe template for local environment variables.
- `README.md` - viewer-facing project guide.

Do not add framework source, package manifests, generated build output, or app config at the root unless it is truly shared orchestration or documentation.

## Backend

Location: `backend/`

Stack:

- Java 21
- Maven wrapper, not Gradle
- Spring Boot 4.0.6
- Spring Security 7 with stateless JWT and refresh tokens
- Spring Data JPA, Hibernate, PostgreSQL 17
- Flyway-owned schema migrations
- MapStruct, Lombok, validation, SpringDoc OpenAPI
- Local profile-image storage exposed from `/uploads/**`

Architecture package root:

```text
com.darklordempeor.jobsdb
```

Follow the existing Clean Architecture split:

- `domain/` - pure domain models, repository ports, business services, and exceptions. Do not add Spring annotations here.
- `application/` - use cases and application ports.
- `infrastructure/` - persistence entities, JPA repositories, adapters, security, email, and storage.
- `interfaces/` - REST controllers, DTOs, MapStruct mappers, and exception advice.

Important backend rules:

- Use `application.yml`, not `.properties`.
- Keep JPA entities separate from domain models.
- Keep controllers thin; orchestration belongs in use cases.
- Application code must not import HTTP DTOs or infrastructure implementations. Map validated requests with `ApiCommandMapper`; keep commands/results in `application/model/`.
- Interfaces must not inject repository ports. Response mappers must be pure; batched enrichment belongs in `JobEnrichment`.
- Use focused ports: `CompanyPort`, `ApplicationWorkflowPort`, `CandidateWorkspacePort`, `AdminQueryPort`, `AuditPort`, `InterviewPort`, and `NotificationPort`. Do not recreate an aggregate hiring persistence port.
- `JobSeekerProfilePort` returns typed `HiringModels.Profile` values. Keep JDBC row maps inside persistence adapters.
- `ArchitectureTest` enforces source boundaries. Spring service/transaction annotations on use cases are an intentional convention; domain/models/ports must remain framework-free.
- Wrap API responses in `ApiResponse<T>`.
- Add schema changes through Flyway migrations in `backend/src/main/resources/db/migration/`.
- Keep `spring.jpa.hibernate.ddl-auto=validate`; do not let Hibernate create schema.
- Admin users are seeded by Flyway only. Do not add a public admin registration endpoint.
- Preserve stateless security and role boundaries: `ROLE_JOB_SEEKER`, `ROLE_EMPLOYER`, and `ROLE_ADMIN`.
- Keep profile-image validation in the storage boundary. Current uploads accept JPG or PNG up to 5 MB and produce `256 x 256` PNG avatars.
- Keep browser-facing backend paths under `/api` or `/uploads` unless routing config is updated in both Docker and local frontend development.

Hiring workflow rules:

- Employer applicant APIs enforce job ownership; `/applicants/page` supports status filtering and pagination. The legacy list returns the first 50.
- Applications capture the submitted profile and an initial event transactionally. Do not substitute the current profile for missing legacy snapshots.
- Status transitions compare expected status and record internal notes; candidate responses must not reveal notes or actor identifiers.
- Refresh tokens are purpose-bound, hashed in PostgreSQL, rotated once, and revocable through logout. Never accept a refresh token as an API bearer token.
- New schema is in Flyway V5. Keep the documented contracts in `contracts/HIRING_WORKFLOWS.md` aligned with code and tests.
- In-app notifications use additive Flyway V8 and join the triggering workflow transaction. Scope inbox/read SQL by the authenticated recipient; never expose event keys, actor identifiers or internal notes. Keep `contracts/NOTIFICATIONS.md` aligned. Do not fabricate historical alerts or add external delivery implicitly.
- Saved searches use `SavedSearchPort` and Flyway V9. Enforce the 20-search owner limit transactionally. First-publication claims and `JOB_MATCH` notifications join the job status transaction; paused/banned recipients are excluded. Keep literal matching shared between results and delivery, and do not add historical delivery on resume/republication. See `contracts/SAVED_SEARCHES.md`.
- Private résumé PDFs use `ResumePort` and Flyway V10. Keep bytes out of metadata queries and public `/uploads` routes. Limit each candidate to ten 5 MiB versions; capture the selected version in the application transaction and retain referenced versions. Downloads require candidate/job ownership and no-store attachment headers. Preserve legacy résumé links; see `contracts/RESUME_VERSIONS.md`.
- Interview scorecards use `ScorecardPort` and Flyway V11. Restrict current feedback and revisions to the job's employer; never enrich candidate interview/application responses with feedback. Serialize saves on the same application lock as interview lifecycle writes. Finalization requires a completed interview and complete assessment; finalized records are immutable. Revision insertion joins the scorecard transaction. No automatic application status changes or notifications. See `contracts/SCORECARDS.md`.
- Hiring analytics use `HiringAnalyticsPort` to return owner-scoped aggregates from existing applications/events, without schema changes. Date filters select a UTC submission cohort (inclusive, maximum 366 days); progress is recorded through report time. Deduplicate stage events per application and use the earliest valid hire timestamp for time-to-hire. Expose missing-history/sample counts, never fabricate times or include candidate identities/feedback. Keep `contracts/HIRING_ANALYTICS.md` aligned.

Seeded local data:

```text
admin email: admin@jobsdb.local
admin password: password
sample jobs: 20 active records owned by a seeded employer
```

Useful commands:

```powershell
cd C:\projects\Fullstack-job-seeker-clone\backend
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

## Frontend

Location: `frontend/`

Stack:

- Angular 21
- Standalone components only
- Angular Router lazy feature routes
- NgRx SignalStore, not classic actions and reducers
- Tailwind CSS 4
- Strict TypeScript
- Functional HTTP interceptors
- Nginx production routing for `/api` and `/uploads`

Main app layout:

- `core/` - auth, guards, HTTP interceptors, i18n, and shell layout.
- `data/` - API repositories.
- `application/use-cases/` - workflow rules independent of Angular.
- `domain/` - TypeScript models, transition rules, and repository contracts.
- `core/di/` - repository injection tokens, implementation bindings, and use-case factories.
- `features/` - lazy routed feature areas.
- `shared/` - reusable UI components and pipes.

Feature areas:

- `features/home/` - public entry page.
- `features/auth/` - login and job-seeker or employer registration.
- `features/jobs/` - public paginated job list, filters, and job detail.
- `features/job-seeker/` - profile editor, avatar upload, applications, and settings.
- `features/job-seeker/saved-searches/` - private criteria management, current matches and in-app alert controls.
- `features/job-seeker/resumes/` - private PDF history, selection, downloads and unused-version deletion.
- `features/employer/scorecard/` - private interview feedback, draft/final workflow and revision history.
- `features/employer/analytics/` - date-filtered hiring aggregates and incomplete-history explanations.
- `features/employer/` - dashboard, post job, manage jobs, applicants, and company settings.
- `features/admin/` - dashboard, users and bans, application moderation.

Angular rules:

- Use `standalone: true` components.
- Use `@if`, `@for`, and `@switch`; do not use `*ngIf` or `*ngFor`.
- Use `input<T>()` and `output<T>()`; do not use `@Input`, `@Output`, or `EventEmitter`.
- Use `inject()` for dependency injection; avoid constructor injection.
- Do not call `subscribe()` inside components. Prefer SignalStore methods, `toSignal()`, async pipe, or `firstValueFrom()` for event-driven operations.
- Keep API calls in `frontend/src/app/data/` repositories.
- Features and auth services inject tokens from `core/di/repository.tokens.ts`, never concrete `data/` repositories. Only `core/di/repository.providers.ts` binds implementations.
- Keep domain and application code free of Angular and NgRx. RxJS observable contracts are allowed.
- Keep HTTP envelopes in `data/dto/` and explicit request field mapping in `data/mappers/`. Shared pagination is `domain/page.model.ts`.
- Use SignalStore for multi-step UI workflows; the applicant flow is the reference implementation. Simple queries may call repository contracts directly.
- `npm run check:architecture` runs automatically before frontend tests/builds; keep its import rules passing.
- Keep TypeScript interfaces in `frontend/src/app/domain/`.
- Add authenticated route groups through the existing `roleGuard(...)`.

Frontend behavior:

- Settings and company profiles persist to the backend; discovery/recommendation preferences do not yet trigger discovery or email delivery.
- Live repositories propagate failures and preserve empty responses. Never return sample data or success from a live API error.
- Demo mode is disabled in both environment files. SessionService owns tokens and shares in-flight refresh requests.
- Public search filters belong in the URL. Apply and save use the shared JobActionsComponent.

Useful commands:

```powershell
cd C:\projects\Fullstack-job-seeker-clone\frontend
npm.cmd install
npm.cmd start
npm.cmd run build
npm.cmd test -- --watch=false
```

The Angular dev server runs at `http://localhost:4200` and proxies `/api` and `/uploads` to `http://localhost:8080`.
The Compose development frontend uses `frontend/proxy.docker.conf.json` targeting `backend:8080` instead.

### Nginx Routing

The production frontend container uses `frontend/nginx.conf` to serve the Angular build and reverse proxy backend-owned paths:

- `/api/**` proxies to `http://backend:8080/api/**`.
- `/uploads/**` proxies to `http://backend:8080/uploads/**`.
- Angular client routes fall back to `index.html`.
- Static assets use long-lived cache headers.
- `client_max_body_size 7m` matches the Spring multipart request limit. The storage adapter separately enforces the 5 MB profile-image limit.

When adding a new browser-facing backend path outside `/api`, update both `frontend/nginx.conf` for Docker and `frontend/proxy.conf.json` for local Angular development. Keep application authorization in Spring Security; Nginx is only the routing boundary.

## Database And Docker

Docker Compose provides:

- `postgres:17`
- pgAdmin on `http://localhost:5050`
- backend on `http://localhost:8080`
- frontend on `http://localhost:4200`
- named volumes for PostgreSQL, pgAdmin, and uploaded images

Root `.env` variables:

```text
DB_NAME
DB_USER
DB_PASS
DB_PORT
JWT_SECRET
PGADMIN_EMAIL
PGADMIN_PASS
PGADMIN_PORT
BACKEND_PORT
FRONTEND_PORT
```

Start only PostgreSQL and pgAdmin:

```powershell
cd C:\projects\Fullstack-job-seeker-clone
docker compose up -d postgres pgadmin
```

Start the full stack:

```powershell
cd C:\projects\Fullstack-job-seeker-clone
docker compose up --build
```

Start the hot-reload development stack:

```powershell
cd C:\projects\Fullstack-job-seeker-clone
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

If Windows PostgreSQL is already using host port `5432`, either stop that service or change `DB_PORT` to another host port such as `5433`.

Docker pgAdmin connection:

```text
host: postgres
port: 5432
database: jobsdb
username: value of DB_USER
password: value of DB_PASS
```

Desktop pgAdmin connection, when Docker owns the host port:

```text
host: 127.0.0.1
port: value of DB_PORT, default 5432
database: jobsdb
username: value of DB_USER
password: value of DB_PASS
```

Do not run `docker compose down -v` unless the user explicitly accepts deleting local PostgreSQL, pgAdmin, and uploaded-image volumes.

## Git Notes

The documented integration branch is:

```text
fullstack_merge
```

Always inspect the live checkout with `git status --short --branch`; it can differ from the integration branch. Do not switch branches or discard local edits implicitly.

There is one root Git repository for the monorepo. Do not reinitialize Git inside `frontend/` or `backend/`.

Before committing:

```powershell
git status --short --branch
```

Avoid committing `.env`, `node_modules/`, `target/`, `dist/`, or uploaded runtime files.

## Documentation Notes

Keep `README.md` viewer-facing and practical. If backend or frontend structure changes, update its schematic sections as part of the same change.

Keep this `AGENTS.md` focused on contributor and coding-agent constraints. Avoid duplicating long user-facing explanations from the README unless they affect implementation choices.

## Verification

For backend changes:

```powershell
cd backend
.\mvnw.cmd test
```

For frontend changes:

```powershell
cd frontend
npm.cmd run build
```

For Docker Compose changes:

```powershell
docker compose config
docker compose -f docker-compose.yml -f docker-compose.dev.yml config
```

Use narrower checks when a change is small, but always report what was and was not verified.

Database integration tests require `JOBSDB_INTEGRATION_TESTS=true` and an isolated PostgreSQL database named `jobsdb_test`. Configure `TEST_DATABASE_URL`, `TEST_DATABASE_USER`, and `TEST_DATABASE_PASSWORD`; the tests run Flyway and write fixtures. See `contracts/HIRING_WORKFLOWS.md` for commands. GitHub Actions uses PostgreSQL 17. Do not point the test suite at the user's application database.
