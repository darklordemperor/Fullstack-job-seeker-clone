# P4 release verification — 2026-10-27

Follow-up: the user approved the remaining security/publication work. [Security release verification](SECURITY_RELEASE_VERIFICATION.md) records the updated dependency audit and release status; the measurements below remain historical evidence from the initial P4 run.

P4 addresses keyboard accessibility and verifies the current working tree on Linux, including Firefox. The fixes are deployed locally and local verification is finished, including a corrected browser regression. Hosted GitHub Actions and dependency maintenance remain separate release gates.

## Changes and reasons

| File | Change |
| --- | --- |
| `frontend/src/app/app.ts`, `app.html`, `app.css` | Add a first-Tab skip link that focuses the current routed main without changing the URL; retain a stable fragment target while routes load. |
| `frontend/src/styles.css` | Add visible keyboard outlines and a main-content scroll offset below the sticky header. |
| `frontend/src/app/core/layout/navbar/navbar.component.ts` | Name main navigation and language controls; expose account/language expanded state; close competing disclosures; return focus to the correct trigger on Escape or language selection. |
| `frontend/src/app/features/employer/post-job/post-job.component.ts` | Add persistent, associated labels to all six fields, preserving existing field names and placeholders. |
| `frontend/src/app/app.spec.ts`, `core/layout/navbar/navbar.component.spec.ts` | Exercise skip focus, empty outlet handling, disclosure state and restored focus. |
| `frontend/e2e/accessibility-workflows.spec.ts` | Exercise keyboard skip, field names and both dropdowns in Chromium, Firefox and WebKit at three viewport sizes. |
| `frontend/e2e/responsive.spec.ts` | Include hiring analytics in the existing 14-viewport route matrix. |
| `frontend/e2e/workflows.spec.ts` | Remove an order-dependent first-page assumption: seed eight newer applications, assert the original is off page one, then review through its stable application deep link. Wait for save completion before reload. |
| `frontend/scripts/verify-docker.mjs` | Check skip navigation, job labels and account keyboard focus through the built Nginx frontend at desktop/mobile widths. |
| `frontend/scripts/verify-upgraded-app.mjs` | Verify deployed skip navigation and language disclosure focus using read-only application checks. |
| `.github/workflows/verify.yml` | Add manual dispatch and bounded job timeouts. |
| `contracts/TESTING.md`, `contracts/README.md` | Document the expanded matrix and link this release evidence. |

## Verified environment and results

The Linux test workspace is an isolated source copy in `jobsdb-p4-linux-runner`, using Ubuntu 24.04, Temurin Java 21.0.12.1, Node 22.23.4, npm 10.9.9, and Playwright 1.64.1. PostgreSQL 17.10 runs in `jobsdb-p4-postgres` on a private Docker network, with database `jobsdb_test` and no published ports. Integration and browser suites run sequentially against that database. The application database is not used for fixtures.

| Check | Result |
| --- | --- |
| Linux `./mvnw --batch-mode verify` with integration enabled | 137 passed; zero failures, errors or skips; JaCoCo gates passed. |
| Linux Node 22 `npm ci`, `npm run test:coverage` | 195 tests in 51 files passed; architecture and coverage gates passed. |
| Linux Node 22 production build | Passed. |
| Windows frontend tests, production build and E2E type check | Passed; 195 tests. |
| Workflow actionlint | Passed. |
| Production, development and verification Compose config checks | All passed. |
| Production-container build and seed | Passed against the isolated verification project. |
| Production-container recreation and persistence | Passed, including identical avatar/PDF bytes, résumé retention, inbox/read state, saved searches, scorecard history, analytics, Nginx and pgAdmin. |
| Production keyboard regression checks | Passed at 320×568 and 1440×900. |
| Initial full Linux browser suite | 161 passed, 2 flaky (Chromium/Firefox), 1 failed (WebKit); all three affected results are the same private-notes workflow. 17.1 minutes; no skipped tests. |
| Corrected private-notes regression | 9/9 passed, zero retries, failures, flakes or skips: three repeats each in Chromium, Firefox and WebKit. 50.5 seconds. |
| Local frontend deployment/read-only smoke | Passed; six smoke checks, including deployed skip and language focus behavior. All 27 application-table fingerprints preserved. |
| Hosted GitHub Actions | Pending publication of the current changes. |

Measured frontend coverage: **76.64% statements, 78.42% branches, 61.47% functions, 77.21% lines**. These are measured whole-included-source results, not 100% coverage claims. Existing per-file domain/use-case gates also passed.

Linux JaCoCo report totals: **1,399/1,486 lines (94.15%)**, **431/462 branches (93.29%)**, and **554/593 methods (93.42%)** across 171 analyzed classes. The separate 90% per-class use-case/domain-service gates passed.

The Chromium route matrix covers **26 role/route combinations × 14 viewports = 364 visits**, from 320×568 to 1920×1080, including short landscape and breakpoint-adjacent sizes. Feature workflows separately exercise scorecards, analytics, résumés, saved searches, notifications and interviews across browser engines. The new accessibility workflow covers 320×568, 844×390 and 1440×900. No finite matrix establishes support for every possible size or a full WCAG/screen-reader audit.

Production post-job screenshots at 320 and 1440 pixels were visually inspected: labels remain visible, content fits without horizontal clipping, buttons wrap on phones, and keyboard focus is visible. Other screenshots remain captured evidence rather than a claim of individual visual review.

The initial private-notes workflow assumed the original applicant remained on the first list page. The captured response contained nine applicants, eight on page one, with the target on page two; Chromium/Firefox retries passed because their worker fixtures restarted. The test now deliberately seeds eight later applicants and uses the existing exact-application deep link. The WebKit retry trace stopped waiting for “Remove saved job” after a reload immediately following the save click; the corrected test waits for the confirmed saved state before reloading. Its browser logs also contained automation/context teardown warnings. The corrected workflow passed all nine no-retry repetitions across the three engines.

The 161 unaffected checks passed in the full run; each of the three affected browser cases passed in the corrected repeat run. The entire 164-case suite was not rerun after this test-only correction. The original result is retained rather than relabeled as a clean full-suite pass.

## Evidence and reproduction

Ignored local artifacts are under `frontend/tmp/p4-linux/`: backend/frontend logs, JUnit and JaCoCo reports, frontend coverage, browser logs/results, container build/recreation logs, dependency audit JSON and the isolated runner Dockerfile. Production phase reports and screenshots are under `frontend/tmp/docker-verification/`. Its `state.json` contains test credentials and must not be published; CI keeps an explicit report/image/log allowlist.

Initial browser artifacts are preserved in `initial-browser-results/` and `initial-playwright-report/`; the corrected run is in `regression-results/` and `regression-playwright-report/`, with `regression.log`. Reproduce the corrected case with:

```bash
npm run test:e2e -- --grep "candidate save, application and employer review" --repeat-each=3 --retries=0
```

For a Linux host with Java 21, Node 22 and a dedicated PostgreSQL 17 `jobsdb_test`, use the commands and database safeguards in [TESTING.md](TESTING.md):

```bash
export JOBSDB_INTEGRATION_TESTS=true
export TEST_DATABASE_URL=jdbc:postgresql://127.0.0.1:5432/jobsdb_test
export TEST_DATABASE_USER=jobsdb
# Set TEST_DATABASE_PASSWORD securely for this isolated database.
(cd backend && chmod +x mvnw && ./mvnw --batch-mode verify)
cd frontend
npm ci
npm run test:coverage
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

## Remaining release gates

1. **Hosted CI:** `.github/workflows/verify.yml` remains untracked in the existing working tree. No hosted run can validate these unpublished changes. Commit/publish the reviewed work and inspect all five jobs and their artifacts before claiming GitHub Actions success. The local Linux pass is separate evidence.
2. **Dependency maintenance:** fresh `npm audit` reports 36 flagged packages: 3 critical, 22 high, 9 moderate and 2 low. `npm audit --omit=dev` reports 6: 4 high and 2 moderate, with no critical findings. Critical development-tree packages are `piscina` 5.1.4, `proxy-addr` 2.0.7 and `tar` 7.5.15. Production high findings involve Angular common/compiler/core/router. Counts are dependency-audit results, not proof that each issue is exploitable in this application. No dependency versions were changed; AGENTS.md requires approval for upgrades. Review compatible Angular 21 patches and development transitive fixes, then repeat audit, build, unit and browser verification.

Raw advisories and fix availability are retained in `audit-all.json` and `audit-production.json`. Representative advisories: [Piscina](https://github.com/advisories/GHSA-67c8-pqhq-4rmx), [proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [tar](https://github.com/advisories/GHSA-23hp-3jrh-7fpw), [Angular host-binding sanitization](https://github.com/advisories/GHSA-hh8m-fm6v-7cvg).

Read-only `npm outdated` resolves compatible Angular targets within the current manifest ranges: framework/compiler packages **21.2.15 → 21.2.25**, CLI/build **21.2.13 → 21.2.28**. These form the proposed patch-upgrade scope, together with the flagged development transitive dependencies. They have not been installed or tested; an updated lockfile and a fresh audit are required to establish which findings are resolved.

## Docker startup recovery

Docker Desktop initially failed on stale `dockerInference` and Secrets Engine socket reparse points. With Docker stopped, the two socket-only runtime directories were moved aside to `C:\Users\DarkLordEmperor\AppData\Local\Docker\run.p4-backup-20261027` and `C:\Users\DarkLordEmperor\AppData\Local\docker-secrets-engine.p4-backup-20261027`. Fresh runtime directories allowed startup. No factory reset or database/upload volume deletion was used. The existing application containers resumed normally. This records the observed recovery; it does not establish that the upstream Windows socket issue cannot recur.

The same inference-socket issue recurred after Docker had stopped between verification sessions. The same guarded directory move restored startup; second backups have suffix `.p4-backup-20261027-0714`. This remains a recurring host issue, not a permanent Docker fix. The temporary Linux runner and test PostgreSQL container were stopped after evidence was copied; their test volume remains available.

## Local deployment and rollback

The updated frontend is running at `http://localhost:4200`, image `sha256:cc938059e3e420defd1a9a4f1c663ca842175bf3960058fb86fb1c24a7c65411`. Only the frontend service was recreated. Read-only smoke checks and pre/post fingerprints confirm all 27 existing application tables were preserved; schema remains V11. The previous frontend image is retained as `jobsdb-frontend:p4-before-20261027` (`sha256:419dec5b92dd3fe4343875b6af7b88ae5a560290603bf48acf07100463fd2451`).

To restore that frontend image without rebuilding it:

```bash
docker tag jobsdb-frontend:p4-before-20261027 fullstack-job-seeker-clone-frontend:latest
docker compose up -d --no-deps --no-build frontend
```
