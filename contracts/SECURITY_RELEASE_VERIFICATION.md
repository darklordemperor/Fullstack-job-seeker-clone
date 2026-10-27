# Security release verification — 2026-10-27

This follow-up applies the approved security updates and publishes the accumulated hiring-workflow/release changes for hosted verification. It supersedes the dependency-maintenance status in [the original P4 report](P4_RELEASE_VERIFICATION.md).

## Dependency changes

`frontend/package.json` raises the minimum secure versions; `frontend/package-lock.json` records the validated dependency graph.

| Dependency | Before | After |
| --- | --- | --- |
| Angular framework/compiler packages | 21.2.15 | 21.2.25 |
| Angular CLI/build | 21.2.13 | 21.2.28 |
| Vitest and V8 coverage provider | 4.1.7 | 4.1.12 |
| PostCSS | 8.5.15 | 8.5.32 |

Vitest and its coverage provider use matching exact versions. Angular remains on major 21. NgRx, Tailwind and Prettier retain their previous installed versions. Compatible transitive security fixes are captured in the regenerated lockfile.

Angular 21's build package pins an affected `undici`; a scoped `@angular/build` override selects **7.30.1** within the same major series. Remove the override once the Angular 21 build package supplies a patched version itself, then repeat audit/build/browser checks. No `--force` or `--legacy-peer-deps` resolution was used. Fresh installs are verified with Node 22/npm 10, while lockfile resolution used the project's declared npm 11.11.0 after the older resolver encountered a peer-resolution error.

The initial audit reported 36 affected packages (3 critical), including six production-tree findings. The patched graph reports **zero vulnerabilities in both full and production-only npm audits**. These are npm advisory results at verification time, not a guarantee that all application/security risks are absent.

## Verification

| Gate | Result |
| --- | --- |
| Linux backend `./mvnw --batch-mode verify` with isolated PostgreSQL | 137 passed, zero failures/errors/skips; coverage gates passed. |
| Linux frontend clean install, architecture, tests and build | 195 tests passed; coverage gates and production build passed. |
| Full npm audit / production-only audit | Both zero findings. |
| Full Linux browser suite, retries disabled | Running. |
| Hosted GitHub Actions | Pending branch/PR publication and execution. |
| Production container persistence and final deployment | Pending final checks. |

CI now gates `npm audit --audit-level=moderate`, runs Playwright with `--retries=0`, and cancels superseded runs for the same branch. The existing five jobs cover backend, frontend, browser, Compose configurations and production-container persistence. These changes are in `.github/workflows/verify.yml`; [TESTING.md](TESTING.md) documents the commands.

Local ignored evidence is under `frontend/tmp/p4-linux/security-*.log`, with browser/coverage artifacts copied separately at completion. All fixture writes use `jobsdb_test`, never the application database. The original P4 traces are retained separately from this final no-retry run.
