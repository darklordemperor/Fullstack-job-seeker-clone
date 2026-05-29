# Agent Notes

This repository is a full-stack JobsDB clone monorepo. Keep the root clean and put app-specific files inside their owning app folder.

## Root Layout

- `backend/` - Spring Boot API.
- `frontend/` - Angular web app.
- `contracts/` - shared API contracts, request/response examples, and future generated clients.
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
- Spring Security 7 with stateless JWT
- Spring Data JPA, Hibernate, PostgreSQL
- Flyway owns schema migrations
- MapStruct, Lombok, SpringDoc OpenAPI

Architecture package root:

```text
com.darklordempeor.jobsdb
```

Follow the existing Clean Architecture split:

- `domain/` - pure domain models, repository ports, business services, exceptions. No Spring annotations here.
- `application/` - use cases and application ports.
- `infrastructure/` - JPA entities/repositories/adapters, security, email.
- `interfaces/` - REST controllers, DTOs, MapStruct mappers, exception advice.

Important backend rules:

- Use `application.yml`, not `.properties`.
- Keep JPA entities separate from domain models.
- Keep controllers thin; orchestration belongs in use cases.
- All API responses use `ApiResponse<T>`.
- Flyway migrations live in `backend/src/main/resources/db/migration/`.
- `spring.jpa.hibernate.ddl-auto=validate`; do not let Hibernate create schema.
- Admin users are seeded by Flyway only. Do not add a public admin registration endpoint.

Seeded admin login:

```text
email: admin@jobsdb.local
password: password
```

Useful commands:

```powershell
cd C:\projects\JobSDB-clone\backend
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

## Frontend

Location: `frontend/`

Stack:

- Angular 21
- Standalone components only
- NgRx SignalStore, not classic actions/reducers
- Tailwind CSS 4
- Strict TypeScript
- Angular Router lazy feature routes
- Functional HTTP interceptors

Angular rules:

- Use `standalone: true` components.
- Use `@if`, `@for`, and `@switch`; do not use `*ngIf` or `*ngFor`.
- Use `input<T>()` and `output<T>()`; do not use `@Input`, `@Output`, or `EventEmitter`.
- Use `inject()` for DI; avoid constructor injection.
- Do not call `subscribe()` inside components. Prefer SignalStore methods, `toSignal()`, or async pipe.
- Keep API calls in `frontend/src/app/data/` repositories.
- Keep TypeScript interfaces only in `frontend/src/app/domain/`.

Useful commands:

```powershell
cd C:\projects\JobSDB-clone\frontend
npm.cmd install
npm.cmd start
npm.cmd run build
npm.cmd test -- --watch=false
```

Local Angular dev server:

```text
http://localhost:4200
```

The frontend proxies `/api` to:

```text
http://localhost:8080
```

## Database And Docker

The project expects PostgreSQL. Docker Compose provides:

- `postgres:17`
- pgAdmin on `http://localhost:5050`
- backend on `http://localhost:8080`
- frontend on `http://localhost:4200`

Root `.env` variables use:

```text
DB_NAME
DB_USER
DB_PASS
DB_PORT
JWT_SECRET
PGADMIN_EMAIL
PGADMIN_PASS
```

Start only Postgres and pgAdmin:

```powershell
cd C:\projects\JobSDB-clone
docker compose up -d postgres pgadmin
```

Start the full stack:

```powershell
cd C:\projects\JobSDB-clone
docker compose up --build
```

Development override:

```powershell
cd C:\projects\JobSDB-clone
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

If Windows PostgreSQL is already using host port `5432`, either stop that service or change `DB_PORT` to another host port such as `5433`. Only one service can bind the same host port at a time.

Docker pgAdmin connection for the Compose network:

```text
host: postgres
port: 5432
database: jobsdb
username: jobsdb
password: jobsdb_dev_password
```

Desktop pgAdmin connection from Windows, when Docker owns the host port:

```text
host: 127.0.0.1
port: 5432
database: jobsdb
username: jobsdb
password: jobsdb_dev_password
```

Do not run `docker compose down -v` unless the user explicitly accepts deleting the local Postgres volume.

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

Avoid committing `.env`, `node_modules/`, `target/`, or `dist/`.

## Verification

For backend changes, prefer:

```powershell
cd backend
.\mvnw.cmd test
```

For frontend changes, prefer:

```powershell
cd frontend
npm.cmd run build
```

Use narrower tests when the change is small, but always report what was and was not verified.
