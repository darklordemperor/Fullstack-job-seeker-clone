# Production container verification

The subsequent [local V4 to V7 upgrade](LOCAL_UPGRADE.md) is complete. The historical recovery notes below describe the earlier V4 state; the current local application now uses Flyway V7.

The isolated `jobsdb-verification` Compose project uses PostgreSQL 17 and the production backend/frontend Dockerfiles. It binds only loopback ports: database 25432, backend 28080, frontend 24200. Its database is always `jobsdb_test`; named volumes belong to this project. pgAdmin is optional under the `tools` profile.

## Run

From the repository root, create `backend/target/docker-verify.env` with test-only credentials. Do not copy the application `.env`. Keep this file ignored; reuse it when restarting existing verification volumes.

```bash
mkdir -p backend/target
# Run once. Replacing credentials while retaining existing volumes breaks DB login.
test -e backend/target/docker-verify.env || {
  printf 'DB_NAME=jobsdb_test\nDB_USER=jobsdb\nDB_PASS=%s\nJWT_SECRET=%s\nPGADMIN_EMAIL=verify@example.com\nPGADMIN_PASS=%s\n' \
    "$(openssl rand -hex 24)" "$(openssl rand -hex 48)" "$(openssl rand -hex 24)" \
    > backend/target/docker-verify.env
}

docker compose --env-file backend/target/docker-verify.env -p jobsdb-verification \
  -f docker-compose.yml -f docker-compose.verify.yml up --build -d postgres backend frontend

# Uses the existing Playwright dependency; install Chromium if absent.
cd frontend
npx playwright install chromium
node scripts/verify-docker.mjs seed
cd ..

docker compose --env-file backend/target/docker-verify.env -p jobsdb-verification \
  -f docker-compose.yml -f docker-compose.verify.yml up -d --force-recreate postgres backend frontend

cd frontend
node scripts/verify-docker.mjs verify
cd ..

# Stop/remove only verification containers; retain the database and upload volumes.
docker compose --env-file backend/target/docker-verify.env -p jobsdb-verification \
  -f docker-compose.yml -f docker-compose.verify.yml down
```

The script checks the resolved project/database/volume/port configuration before requests. It verifies Flyway V1-V7, `nginx -t`, API calls through Nginx, registration/job/application flows, 256×256 avatar conversion and `/uploads` routing. Chromium checks production deep links and reloads at 1440×900 and 320×568, page errors, mobile horizontal overflow, and immutable JavaScript caching. The `verify` phase checks saved account/profile/application data and identical avatar bytes after recreation.

Artifacts are ignored under `frontend/tmp/docker-verification/`: phase reports, desktop/mobile screenshots, and test-only account state. These smoke checks complement unit/integration/E2E suites; they do not establish responsiveness at every size or full accessibility coverage.

To include pgAdmin, add `--profile tools` to the Compose commands, include `pgadmin` in both `up` commands, and pass `--pgadmin` to both script phases. The script then waits for pgAdmin's `/misc/ping` on port 25050 as an additional startup regression check. CI runs this expanded variant. The workflow reads the pgAdmin email from `.env.example`, generates isolated credentials, always collects diagnostics and stops containers, and uploads only reports/screenshots/logs (not account state or env files).

## Windows Docker startup recovery, 2026-10-24

Docker Desktop 4.75.0 failed before container startup because stale Windows Unix sockets could not be accessed: `Docker/run/dockerInference`, then `docker-secrets-engine/engine.sock`. After stopping the failed Desktop/backend processes, the socket directories were renamed to timestamped `.stale-*` backups. Both socket locations needed to be fresh together: the first failed retry had created another inaccessible inference socket. The next startup returned Docker Engine 29.5.2 successfully.

No factory reset, volume deletion, WSL unregister, Docker update, or application database migration was used for this recovery. Existing containers with restart policies started automatically when Desktop recovered. The original runtime folders remain under the user's Local AppData directory for inspection. This is consistent with the reported [Docker Windows stale-socket issue](https://github.com/docker/desktop-feedback/issues/448); the successful engine response was verified locally.

## Results

Verified locally on 2026-10-24:

- Production backend/frontend images built successfully; frontend architecture checks ran during the image build.
- Production, development and verification Compose configurations passed validation.
- `seed` and `verify` smoke phases each passed all six reported checks.
- PostgreSQL 17.10 (Debian 17.10-1.pgdg13+1) ran with Flyway V1-V7 applied.
- Account/profile/application records and the SHA-256 of the converted avatar survived forced recreation of PostgreSQL, backend and frontend containers.
- Chromium deep-link/reload checks passed at 1440×900 and 320×568 with no page errors or horizontal overflow. Both initial screenshots were visually inspected and rendered cleanly.
- The isolated containers were removed afterward with `down`, retaining their volumes. Existing application containers/volumes were not recreated or deleted.
- At the end of the initial smoke run, the pre-existing local stack's backend was stopped and pgAdmin was restarting. The follow-up recovery below addresses that separate stack.

Evidence: `backend/target/docker-verify-build.log`, `frontend/tmp/docker-verification/seed-report.json`, `verify-report.json`, and the four phase/viewport screenshots. Test credentials and fixture state stay ignored locally.

The full unit/E2E suites were not rerun for these Docker/configuration changes; the new production-runtime smoke checks were run instead. This does not validate cloud deployment, SMTP delivery, every route/viewport, or recovery after a Windows reboot.

## Existing local stack and CI follow-up, 2026-10-24

The stopped backend's logs showed a clean shutdown, not an application startup error. Starting its existing image restored the API. The frontend was restart-looping because Nginx could not resolve the stopped `backend`; restarting it after the backend restored routing. These existing images still use Flyway V4. The current-source isolated verification image uses V7. No application database migrations were applied as part of this recovery.

pgAdmin's logs explicitly rejected `admin@jobsdb.local` as a reserved email domain. `.env.example` and the ignored local `.env` now use `admin@example.com` for pgAdmin, retaining the existing password. Only the pgAdmin container was recreated, with its existing data volume. This does not change the application's separate seeded admin account.

Verified backend `/api/jobs` on port 8080, frontend `/api/jobs` and `/jobs` on port 4200, and pgAdmin `/misc/ping` on port 5050 return HTTP 200. Existing PostgreSQL remains healthy and Flyway history remains V1-V4.

The new `production-containers` CI job passed local Actionlint validation. Both expanded smoke phases passed all seven checks locally, including pgAdmin startup, PostgreSQL 17.10/Flyway V1-V7, Nginx/API/uploads, desktop/mobile Chromium rendering and persistence after all four containers were recreated. All three Compose configurations validate. The test containers were stopped with their volumes retained; the existing local stack was left running. No hosted GitHub Actions run has been triggered or claimed.

Follow-up build evidence is in `backend/target/docker-ci-build.log`. The latest seven-check phase reports and screenshots replace the earlier six-check artifacts under `frontend/tmp/docker-verification/`.
