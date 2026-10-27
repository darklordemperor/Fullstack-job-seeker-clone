# Testing and coverage

Use the repository's Maven/JUnit/Mockito and Angular/Vitest suites for unit tests. Real PostgreSQL tests exercise API contracts, permissions, concurrency and transactions. Playwright exercises the rendered Angular application and real API; only the deliberate loading/error-state test intercepts requests.

## Quick commands

```bash
cd backend
./mvnw verify
cd ../frontend
npm ci
npm run test:coverage
npm run build
```

On Windows use `mvnw.cmd`, `npm.cmd` and `npx.cmd`. Java 21 is required. `verify` produces the backend HTML report at `backend/target/site/jacoco/index.html`, plus XML and CSV. It enforces at least 90% line, branch and method coverage **for each use-case/domain-service class**. Reports include the whole backend; the gate does not claim that every infrastructure class has that coverage. Each run replaces execution data to avoid combining old measurements.

## Frontend measured coverage

Run `npm run test:coverage` for Angular/Vitest with V8 coverage. Ignored reports are under `frontend/coverage/`: HTML, LCOV and JSON summary. The provider matches installed Vitest 4.1.12; no test framework was replaced.

The gate requires at least **68% statements, 70% branches, 50% functions and 68% lines** across included source. Domain rules and application use cases each require **90% on all four metrics**. Exact-file thresholds are discovered from those directories so coverage in one file cannot mask another file's gaps. These are baseline floors, not a claim that the whole frontend is fully covered.

Coverage includes untested app source. It excludes tests, type-only models/repository interfaces, route declarations and app bootstrap configuration. Browser tests also exercise role routing. Include patterns belong in Angular's `coverageInclude` option so virtual bundles are measured before source-map remapping; source-only patterns directly in Vitest produced a false 0% report during setup.

See [Angular coverage guidance](https://angular.dev/guide/testing/code-coverage) and [the measured lifecycle release](INTERVIEW_LIFECYCLE_AND_COVERAGE.md). CI runs the same command and uploads coverage even on failure. Do not lower thresholds simply to make a change pass.

## Isolated database integration tests

Create a disposable database named **jobsdb_test** with a role that owns it. Never supply the application's database. Flyway migrates the test database and tests write uniquely named fixtures. The test URL is checked before connection and every HTTP helper checks `current_database()`.

```bash
export JOBSDB_INTEGRATION_TESTS=true
export TEST_DATABASE_URL=jdbc:postgresql://127.0.0.1:5432/jobsdb_test
export TEST_DATABASE_USER=jobsdb
export TEST_DATABASE_PASSWORD=your-test-database-password
cd backend
./mvnw verify
```

Without `JOBSDB_INTEGRATION_TESTS=true`, integration tests are skipped; report that explicitly. CI uses PostgreSQL 17. Local verification may use a different PostgreSQL version; record the version with the results.

Rollback tests inject an exception **after a real snapshot, event or audit SQL write**, then inspect committed database state outside the request transaction. They verify that submission, status transition and user ban do not leave partial changes. Mockito unit tests alone are not evidence of transaction rollback.

## Browser tests

Keep the isolated database running, stop integration tests before browser tests, and leave ports 4207 and 8085 free. Browser tests start their own Angular and Spring servers and stop them after the run. They use the same `TEST_DATABASE_*` variables above; the local default is PostgreSQL on port 55437. The launcher rejects database names other than `jobsdb_test`.

```bash
cd frontend
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
# Faster local check:
npm run test:e2e:chromium
```

On Windows omit `--with-deps`. Set `JAVA_HOME` to Java 21 if needed. The launcher applies a Windows-only JDK selector fallback to the test backend process; production configuration is unaffected.

The Chromium matrix visits 26 role/route combinations per viewport (364 combinations), including private résumés and saved searches for candidates, employer hiring analytics, and the notification inbox for candidate, employer and admin accounts:

| Width × height | Purpose |
| --- | --- |
| 320 × 568, 390 × 844 | Small and standard phones |
| 639 × 800, 640 × 800, 641 × 800 | Around the small breakpoint |
| 767 × 1024, 768 × 1024, 769 × 1024 | Around the medium breakpoint |
| 844 × 390 | Short landscape |
| 1023 × 768, 1024 × 768, 1025 × 768 | Around the desktop navigation breakpoint |
| 1440 × 900, 1920 × 1080 | Desktop sizes |

It checks successful role routing, visible main content, no error alerts, no document overflow, mobile-menu access/Escape focus and uncaught page errors. Every profile drawer (including work experience) and the moderation dialog are also checked for fit and keyboard behavior. Phone/tablet/desktop screenshots are saved for review. Chromium, Firefox and WebKit are configured for workflow checks covering keyboard login/logout, save persistence, submitted-profile review/private notes, loading/error/retry/empty states, publication/registration/application/settings, and admin ban/unban. Candidate-workspace workflows additionally cover saved-job navigation, closure/removal, work-history validation, failed-save retention, persistence, editing and deletion at 320×568, 768×1024, 844×390 and 1440×900. See [the lifecycle and coverage release](INTERVIEW_LIFECYCLE_AND_COVERAGE.md) for the latest results and [the earlier measured results](QA_VERIFICATION_RESULTS.md) for browser availability and actual outcomes.

Artifacts: `frontend/playwright-report/index.html`, `frontend/test-results/results.json`, screenshots and failure traces under `frontend/test-results/`. These are ignored runtime artifacts. Screenshots are evidence for human review, not approved visual-regression baselines. No finite viewport matrix proves every width/height, browser version, zoom level or real-device keyboard behavior.

Accessibility workflows run on all three engines at 320×568, 844×390 and 1440×900. They verify the first-Tab skip link, focus transfer to the current main and then its first field, unchanged route URLs, persistent job-field labels, and language/account disclosure state and Escape focus restoration. These checks supplement the existing modal keyboard tests; they do not constitute a complete WCAG or assistive-technology audit. See [P4 release verification](P4_RELEASE_VERIFICATION.md) for the latest Linux results and remaining release gates.

Notification workflows additionally cover employer/candidate delivery, persistent read state, exact application/interview links, private-note exclusion and load-error recovery in four viewports. See [In-app notifications](NOTIFICATIONS.md) for the current run and any browser availability limits.

Saved-search workflows cover URL-prefilled criteria, salary validation, failed-save recovery, matching results, duplicate-safe job alerts, pause/resume without backfill and deletion at the same four sizes. See [Saved searches](SAVED_SEARCHES.md) for the latest measured run.

## CI and container verification

`.github/workflows/verify.yml` runs backend tests with coverage gates, frontend tests/build, three browser engines against PostgreSQL 17, and production/development/verification Compose configuration validations. Its `production-containers` job builds the real Dockerfiles, starts an isolated PostgreSQL/backend/Nginx/pgAdmin stack, runs `verify-docker.mjs seed --pgadmin`, recreates containers while retaining volumes, then runs `verify --pgadmin` to check persistence. pgAdmin uses the documented `.env.example` email so invalid defaults cause a startup failure in CI. Credentials are generated for the job and masked.

The workflow also supports manual dispatch. Backend, frontend, browser, Compose and production-container jobs are bounded to 20, 15, 40, 5 and 30 minutes respectively. The workflow must be committed and published before GitHub can run it; a local workflow file alone is not hosted CI evidence.

CI rejects npm audit findings at moderate severity or above and runs browser tests with retries disabled. Runs for the same branch supersede older runs, including the push/PR overlap. See [the security release verification](SECURITY_RELEASE_VERIFICATION.md) for dependency patch scope and current release evidence.

JUnit/coverage and Playwright artifacts upload even on failures. Production-container artifacts retain phase reports (including partial failure reports), screenshots, build/runtime logs and container status for 14 days. The upload allowlist excludes `state.json` and credential files; generated Spring security passwords are redacted from runtime logs. Isolated containers are stopped in an `always()` step without deleting volumes. See [Production container verification](DOCKER_VERIFICATION.md) for local commands. A local pass does not prove that the GitHub Actions run has passed.

```bash
docker compose --env-file .env.example config --quiet
docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.dev.yml config --quiet
```

With Docker running, separately verify a production container build, `/api` proxy, `/uploads` delivery and a direct Angular deep-link refresh. Configuration validation alone does not verify these. Do not delete persistent volumes to run tests.

Tool references: [JaCoCo Maven plugin](https://www.jacoco.org/jacoco/trunk/doc/maven.html), [coverage rules](https://www.jacoco.org/jacoco/trunk/doc/check-mojo.html), [Playwright web servers](https://playwright.dev/docs/test-webserver).

Interview workflow tests cover employer proposals with failed-save recovery, candidate acceptance, calendar download, rescheduling, stale-version rejection, cancellation, decline, immutable revision history and creation of a fresh round at four viewport sizes. Both role-specific interview pages are included in the 14-viewport route matrix. See [Interview scheduling verification](INTERVIEW_SCHEDULING.md) for measured results.
