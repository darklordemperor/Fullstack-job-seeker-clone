# Agent Notes

This repository is organized as a two-app JobsDB clone:

- `frontend/` contains the Angular app.
- `backend/` contains the Spring Boot API.
- `contracts/` is reserved for shared API contracts, examples, and generated client artifacts.

Keep root-level files limited to orchestration and documentation. App-specific source, package files, build output, and framework configuration should stay inside `frontend/` or `backend/`.

Use Docker Compose from the repository root for local PostgreSQL:

```bash
docker compose up -d postgres
```

Use PowerShell-friendly commands on Windows:

```powershell
cd frontend; npm.cmd install; npm.cmd start
cd backend; .\mvnw.cmd spring-boot:run
```
