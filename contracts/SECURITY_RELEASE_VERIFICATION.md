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
| Full Linux browser suite, retries disabled | 164 passed; zero skipped, failed or flaky cases; 13.0 minutes. |
| Hosted GitHub Actions | All five jobs passed on application-code commit `b7925f57d6879c4f4e00606b029401bb2380f3b9`; see linked run below. |
| Production container persistence and final deployment | Passed before/after recreation, then deployed locally; all 27 application-table fingerprints preserved. |
| Rollback image smoke | Reconstructed pre-security image starts, proxies preserved jobs and retains P4 skip navigation. |

Hosted evidence: [successful Verify run 40439148256](https://github.com/darklordemperor/Fullstack-job-seeker-clone/actions/runs/40439148256). The backend, frontend, browser, Compose and production-container jobs all concluded successfully. [Draft PR #1](https://github.com/darklordemperor/Fullstack-job-seeker-clone/pull/1) contains the accumulated changes; its checks show any later documentation-only validation runs. The PR is intentionally not merged.

Measured frontend coverage after the patches: **76.94% statements, 78.47% branches, 62.84% functions, 77.62% lines**. Coverage gates passed. Clean installation was also checked on Windows; Linux/hosted CI supply the complete runtime/build/browser evidence.

CI now gates `npm audit --audit-level=moderate`, runs Playwright with `--retries=0`, and cancels superseded runs for the same branch. The existing five jobs cover backend, frontend, browser, Compose configurations and production-container persistence. These changes are in `.github/workflows/verify.yml`; [TESTING.md](TESTING.md) documents the commands.

Local ignored evidence is under `frontend/tmp/p4-linux/security-*.log`, with browser/coverage artifacts copied separately at completion. All fixture writes use `jobsdb_test`, never the application database. The original P4 traces are retained separately from this final no-retry run.

Detailed artifacts: `security-browser-results/results.json`, `security-playwright-report/`, `security-coverage/`, `security-final-audit.json`, `security-final-production-audit.json`, `security-production-seed.log`, `security-production-verify.log`, `security-local-smoke.log`, and `security-application-before.json` / `security-application-after.json`. Production phase reports/screenshots are under `frontend/tmp/docker-verification/`; credential-bearing state remains ignored and is not included in CI's artifact allowlist.

## Local release and rollback

The patched frontend is live at `http://localhost:4200`, image `sha256:6c1a97e5b79bad0c0af38db196d78c47aafc803bc5834c2964a3d3fd0e829e8b`. Only the frontend service was replaced; read-only smoke checks cover public job data, OpenAPI routes, unauthorized access rejection, deep-link/reload rendering, skip navigation and disclosure focus. Schema remains V11 and all 27 application-table fingerprints match the pre-deployment baseline.

The immediate previous image was unavailable by its recorded digest when tagging the rollback image. A replacement baseline was rebuilt from the saved pre-security manifests/lockfile and unchanged P4 frontend source, then smoke-tested in a temporary loopback-only container. It is retained as `jobsdb-frontend:security-before-20261027`; this is a reconstructed rollback baseline, not a claim that the original image digest was recovered. It intentionally contains the old dependencies and should only be used for temporary recovery.

```bash
docker tag jobsdb-frontend:security-before-20261027 fullstack-job-seeker-clone-frontend:latest
docker compose up -d --no-deps --no-build frontend
```

The temporary rollback container was removed after its read-only smoke check. Database and upload volumes were not deleted. The older P4 report remains historical evidence rather than the current dependency/deployment status.
