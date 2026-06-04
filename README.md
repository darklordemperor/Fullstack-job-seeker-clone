# JobsDB Clone

A full-stack JobsDB-style job marketplace with role-based workflows for job seekers, employers, and administrators.

## Project Structure

```text
Fullstack-job-seeker-clone/
|-- backend/                 Spring Boot REST API
|-- frontend/                Angular web application
|-- contracts/               Shared API contract notes and future generated clients
|-- docker-compose.yml       Production-like local stack
|-- docker-compose.dev.yml   Hot-reload Docker overrides
|-- .env.example             Local environment template
|-- AGENTS.md                Repository guidance for coding agents
`-- README.md
```

## Features

### Public And Authentication

- Browse paginated active jobs and filter by keyword or location.
- View job details.
- Register as a job seeker or employer.
- Log in with stateless JWT authentication and refresh tokens.

### Job Seeker

- Edit a profile with personal information, location, summary, expected salary, resume URL, skills, work experience, education, languages, and licences or certifications.
- Upload a JPG or PNG profile image up to 5 MB. The backend crops and resizes it to a `256 x 256` PNG.
- Apply for jobs and review submitted applications.
- Open profile settings. The current settings screen is UI-only and is not persisted yet.

### Employer

- Edit the company profile.
- Create, update, publish, close, and review owned jobs.
- Open the applicant list for a job. The current backend applicant endpoint returns an empty placeholder list.

### Admin

- Review dashboard statistics.
- List users, ban users with a reason, and lift bans.
- Review and delete job applications with an audit reason.
- Close jobs.

## Technology

### Backend

- Java 21
- Spring Boot 4.0.6 and Spring Security 7
- Maven wrapper
- Stateless JWT authentication with JJWT
- Spring Data JPA, Hibernate, PostgreSQL 17, and Flyway
- MapStruct, Lombok, validation, and SpringDoc OpenAPI
- Local filesystem profile-image storage exposed under `/uploads/**`

### Frontend

- Angular 21 standalone components
- Angular Router lazy feature routes
- NgRx SignalStore
- Tailwind CSS 4
- Strict TypeScript
- Functional HTTP interceptors
- Nginx production image with `/api` and `/uploads` reverse proxies

## Local Setup

Requirements:

- Java 21
- Node.js 22 or a compatible current Node.js version
- npm
- Docker Desktop with Docker Compose

Create the root environment file:

```powershell
Copy-Item .env.example .env
```

Update the placeholder secrets in `.env`, then start PostgreSQL and pgAdmin:

```powershell
docker compose up -d postgres pgadmin
```

Run the backend:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Run the frontend in a second terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd start
```

Local URLs:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:4200` |
| Backend API | `http://localhost:8080/api` |
| Swagger UI | `http://localhost:8080/swagger-ui.html` |
| OpenAPI JSON | `http://localhost:8080/api-docs` |
| pgAdmin | `http://localhost:5050` |

The Angular development server proxies both `/api` and `/uploads` to `http://localhost:8080`.

## Seed Data

Flyway creates:

- An admin account: `admin@jobsdb.local` / `password`
- A local seed employer used by sample jobs
- Twenty active sample jobs for public browsing

The migrations live in `backend/src/main/resources/db/migration/`:

| Migration | Purpose |
| --- | --- |
| `V1__init_schema.sql` | Core users, profiles, jobs, applications, refresh tokens, bans, and audit logs |
| `V2__seed_admin.sql` | Initial admin account |
| `V3__reset_seed_admin_password.sql` | Known local admin password |
| `V4__profile_fields_certifications_and_seed_jobs.sql` | Extended job-seeker profile, licences, seed employer, and sample jobs |

## API Overview

| Area | Endpoints |
| --- | --- |
| Authentication | `POST /api/auth/register/job-seeker`, `POST /api/auth/register/employer`, `POST /api/auth/login`, `POST /api/auth/refresh-token` |
| Public jobs | `GET /api/jobs`, `GET /api/jobs/{id}` |
| Job seeker | `GET /api/job-seeker/profile`, `PUT /api/job-seeker/profile`, `POST /api/job-seeker/profile/image` |
| Applications | `POST /api/applications`, `GET /api/applications/my` |
| Employer | `GET /api/employer/profile`, `PUT /api/employer/profile`, `GET /api/employer/jobs`, `GET /api/employer/jobs/{id}/applicants` |
| Employer jobs | `POST /api/jobs`, `PUT /api/jobs/{id}`, `PATCH /api/jobs/{id}/status` |
| Admin | `GET /api/admin/stats`, `GET /api/admin/users`, `POST /api/admin/users/{id}/ban`, `DELETE /api/admin/users/{id}/ban`, `GET /api/admin/applications`, `DELETE /api/admin/applications/{id}`, `PATCH /api/admin/jobs/{id}/close` |

API responses use the shared `ApiResponse<T>` envelope.

## Docker

Start the complete production-like stack:

```powershell
docker compose up --build
```

Start the complete development stack with backend and frontend hot reload:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Docker Compose persists PostgreSQL data, pgAdmin data, and uploaded profile images in named volumes. Do not run `docker compose down -v` unless you intend to delete that local data.

If port `5432` is already in use, change `DB_PORT` in `.env`, for example to `5433`.

## Nginx Routing

The production frontend image builds Angular and serves the generated files through Nginx. Its configuration lives in `frontend/nginx.conf`.

| Request | Nginx behavior |
| --- | --- |
| `/api/**` | Proxies to the Spring Boot container at `http://backend:8080/api/**` |
| `/uploads/**` | Proxies uploaded profile images to `http://backend:8080/uploads/**` |
| Static assets such as `.js`, `.css`, and images | Serves files directly with a 30-day immutable cache header |
| Angular routes such as `/jobs/{id}` or `/employer/dashboard` | Falls back to `index.html` so Angular Router can handle the route |

Nginx also enables gzip compression and accepts request bodies up to `7m`. This matches the backend multipart request limit while the profile-image storage adapter applies the stricter 5 MB image limit.

During local `npm.cmd start` development, Nginx is not used. Angular uses `frontend/proxy.conf.json` to forward `/api` and `/uploads` to `http://localhost:8080`.

## Verification

Backend tests:

```powershell
cd backend
.\mvnw.cmd test
```

Frontend production build:

```powershell
cd frontend
npm.cmd run build
```

Frontend tests:

```powershell
cd frontend
npm.cmd test -- --watch=false
```
