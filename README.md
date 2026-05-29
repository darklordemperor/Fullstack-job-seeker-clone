# JobsDB Clone

Two-project workspace for a JobsDB-style application.

```text
jobsdb-clone/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
├── docker-compose.dev.yml
├── contracts/
├── backend/
└── frontend/
```

## Projects

- `frontend/` - Angular 21 app.
- `backend/` - Spring Boot 4 API with PostgreSQL, JPA, Flyway, validation, security, and OpenAPI dependencies.
- `contracts/` - shared API contracts and examples.

## Local Setup

Copy the environment file if needed:

```bash
cp .env.example .env
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Run the backend:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Run the frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd start
```

Default URLs:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:8080`
- PostgreSQL: `localhost:5432`

## Development Docker

For PostgreSQL plus pgAdmin:

```bash
docker compose up -d
```

pgAdmin runs at `http://localhost:5050`.

For backend hot reload in Docker:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build backend
```

## Backend Setup

The backend lives in `backend/` and uses Java 21, Maven, Spring Boot 4.0.6, Spring Security 7, JJWT, Spring Data JPA, PostgreSQL, Flyway, MapStruct, Lombok, and SpringDoc OpenAPI.

Run locally from PowerShell:

```powershell
docker compose up -d postgres
cd backend
.\mvnw.cmd spring-boot:run
```

Swagger UI is available at `http://localhost:8080/swagger-ui.html`.

Flyway owns the schema. Migrations are in `backend/src/main/resources/db/migration/`:

- `V1__init_schema.sql` creates the JobsDB schema.
- `V2__seed_admin.sql` seeds `admin@jobsdb.local`.

## Frontend Setup

The frontend lives in `frontend/` and uses Angular 21 standalone components, Angular Router lazy routes, NgRx SignalStore, Tailwind CSS 4, strict TypeScript, and functional HTTP interceptors.

Run locally from PowerShell:

```powershell
cd frontend
npm.cmd install
npm.cmd start
```

The Angular dev server runs at `http://localhost:4200` and proxies `/api` to `http://localhost:8080` through `frontend/proxy.conf.json`.

Production Docker build:

```bash
docker build -t jobsdb-frontend ./frontend
```
