# Agent Notes

This repository is a full-stack JobsDB clone monorepo. Keep the root clean and put app-specific files inside their owning app folder.

## Root Layout

- `backend/` - Spring Boot REST API.
- `frontend/` - Angular web app.
- `contracts/` - shared API contract notes, request/response examples, and future generated clients.
- `docker-compose.yml` - production-like local stack.
- `docker-compose.dev.yml` - hot-reload development overrides.
- `.env.example` - safe template for local environment variables.

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
- Wrap API responses in `ApiResponse<T>`.
- Add schema changes through Flyway migrations in `backend/src/main/resources/db/migration/`.
- Keep `spring.jpa.hibernate.ddl-auto=validate`; do not let Hibernate create schema.
- Admin users are seeded by Flyway only. Do not add a public admin registration endpoint.
- Preserve stateless security and role boundaries: `ROLE_JOB_SEEKER`, `ROLE_EMPLOYER`, and `ROLE_ADMIN`.
- Keep profile-image validation in the storage boundary. Current uploads accept JPG or PNG up to 5 MB and produce `256 x 256` PNG avatars.

Current backend caveat:

- `GET /api/employer/jobs/{id}/applicants` returns an empty placeholder list. Treat it as unfinished behavior when extending the employer flow.

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

Feature areas:

- `features/auth/` - login and job-seeker or employer registration.
- `features/jobs/` - public paginated job list, filters, and job detail.
- `features/job-seeker/` - profile editor, avatar upload, applications, and settings.
- `features/employer/` - dashboard, post job, manage jobs, applicants, and company settings.
- `features/admin/` - dashboard, users and bans, application moderation.

Angular rules:

- Use `standalone: true` components.
- Use `@if`, `@for`, and `@switch`; do not use `*ngIf` or `*ngFor`.
- Use `input<T>()` and `output<T>()`; do not use `@Input`, `@Output`, or `EventEmitter`.
- Use `inject()` for dependency injection; avoid constructor injection.
- Do not call `subscribe()` inside components. Prefer SignalStore methods, `toSignal()`, async pipe, or `firstValueFrom()` for event-driven operations.
- Keep API calls in `frontend/src/app/data/` repositories.
- Keep TypeScript interfaces in `frontend/src/app/domain/`.
- Add authenticated route groups through the existing `roleGuard(...)`.

Current frontend caveat:

- `features/job-seeker/settings/` currently updates local UI state only. It does not persist settings to the backend.

Useful commands:

```powershell
cd C:\projects\Fullstack-job-seeker-clone\frontend
npm.cmd install
npm.cmd start
npm.cmd run build
npm.cmd test -- --watch=false
```

The Angular dev server runs at `http://localhost:4200` and proxies `/api` and `/uploads` to `http://localhost:8080`.

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

The active integration branch is:

```text
fullstack_merge
```

There is one root Git repository for the monorepo. Do not reinitialize Git inside `frontend/` or `backend/`.

Before committing:

```powershell
git status --short --branch
```

Avoid committing `.env`, `node_modules/`, `target/`, `dist/`, or uploaded runtime files.

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
