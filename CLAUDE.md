# Claude Instructions

Follow this root layout:

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

Root files are only for repository-wide instructions, environment defaults, Docker orchestration, and shared contracts. Put Angular-specific work in `frontend/` and Spring Boot-specific work in `backend/`.

The local database is PostgreSQL managed by Docker. Keep database credentials in `.env` and mirror new variables in `.env.example`.

Default local services:

- Angular frontend: `http://localhost:4200`
- Spring Boot backend: `http://localhost:8080`
- PostgreSQL: `localhost:5432`

Prefer small, focused changes and update this file if the project-level workflow changes.
