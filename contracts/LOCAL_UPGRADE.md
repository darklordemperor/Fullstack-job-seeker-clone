# Local V4 to V7 upgrade — 2026-10-24

Historical upgrade record: the local stack subsequently advanced through V10. See [the résumé release](RESUME_VERSIONS.md#local-deployment) for the current version and fresh V9 backup. The reusable verification script now checks notification, saved-search and résumé endpoints as well.

The existing local application now runs the current backend/frontend production builds at http://localhost:4200, with the API on port 8080. PostgreSQL remains version 17.10; Flyway V1-V7 all succeeded. pgAdmin remains available on port 5050.

## Backup and rehearsal

Durable recovery files are outside the checkout, at:

```text
C:\projects\Fullstack-job-seeker-clone-backups\20261024-102333
```

The folder contains the 29,543-byte custom-format `database-v4.dump`, `uploads-v4.tar.gz`, 156,457,472-byte `images-v4.tar`, SHA-256 archive manifest, original image/volume inventory, original Compose/env configuration, before/after database fingerprints, browser reports/screenshots and rehearsal logs. Env files and the database dump are private local recovery data; do not publish this folder or add it to Git.

The frontend/backend were stopped for a consistent database/upload backup. PostgreSQL and pgAdmin were not recreated. The V4 database was restored to a separate, newly created `jobsdb_test` volume and all original table fingerprints matched before migration. The exact new image IDs were then run against that restored database. Only after Flyway V5-V7, data integrity and browser/API checks passed were those same images promoted to the existing application containers.

## Verified preservation and behavior

- All 13 original tables retained identical row counts and content fingerprints before/after the rehearsal migration and before/after the real migration.
- Preserved data includes 3 users, 20 jobs, 1 employer profile and 1 job-seeker profile. Applications and the other original tables were empty.
- The uploads volume was empty; its archive was restored in rehearsal and its before/after file checksums match. This run does not claim preservation testing with populated uploads; the separate production smoke suite covers that case.
- Both the rehearsal and actual stack passed five read-only smoke checks: jobs through Nginx; deployed saved-job/interview/outcome/history OpenAPI paths; anonymous access rejected by private endpoints; desktop/mobile deep-link and reload rendering; interview route redirected to login.
- Chromium checked 1440×900 and 320×568 with no page errors or horizontal overflow. The actual-stack screenshots were visually inspected.
- The fingerprint guard was tested with an intentionally incorrect baseline and correctly failed. No application rows were changed by the smoke tests.
- Rehearsal containers were removed without deleting their volumes. The application, database and pgAdmin remain running.

This is a local deployment, not a cloud release. Hosted GitHub Actions has not been run. Existing unit/integration/E2E evidence remains in the other verification reports; this turn ran the upgrade-specific checks rather than repeating those suites.

## Reusable read-only checks

```bash
# From repository root. Prints counts/hashes, never database row values.
node backend/scripts/database-fingerprint.mjs jobsdb-postgres jobsdb

# Pass a previous fingerprint JSON to fail if any original table changed.
node backend/scripts/database-fingerprint.mjs jobsdb-postgres jobsdb /path/to/database-before.json

cd frontend
node scripts/verify-upgraded-app.mjs local
# Separate rehearsal ports 24200/28080:
node scripts/verify-upgraded-app.mjs rehearsal
```

The fingerprint script uses exact whole-table aggregation suitable for this small local database. It is not a production-scale monitoring query. Once users legitimately edit data, comparison to the pre-upgrade snapshot is expected to fail.

## Recovery procedure

The backup folder's `recovery.compose.json` uses the archived V4 image tags, a separate project and new volumes, and loopback ports 24200/28080. It does not replace the running V7 stack. Its Compose configuration was validated; the V4 dump restore was exercised during the upgrade rehearsal. A full switch back to the old stack was not performed.

From that backup folder, if recovery is needed:

```bash
docker image load --input images-v4.tar
docker compose --env-file rehearsal.env -f recovery.compose.json up -d --wait postgres
# The following restore is for the fresh recovery database only; do not repeat on a populated target.
docker cp database-v4.dump jobsdb-recovery-20261024-102333-postgres-1:/tmp/database-v4.dump
docker exec jobsdb-recovery-20261024-102333-postgres-1 \
  pg_restore -U jobsdb -d jobsdb_test --exit-on-error --no-owner /tmp/database-v4.dump
docker compose --env-file rehearsal.env -f recovery.compose.json create backend frontend
docker run --rm \
  --mount type=volume,source=jobsdb-recovery-20261024-102333_uploads_data,target=/uploads \
  --mount "type=bind,source=$PWD,target=/backup,readonly" \
  --entrypoint tar nginx:alpine -xzf /backup/uploads-v4.tar.gz -C /uploads
docker compose --env-file rehearsal.env -f recovery.compose.json up -d backend frontend
```

Verify the recovered database against `database-before.json` using the fingerprint script, and inspect the recovered application on port 24200 before considering any port switch. The snapshot predates subsequent user changes; replacing newer data with it would lose those later changes. Keep the V7 volumes intact, and do not use `down -v`, Flyway repair or manually delete migration-history rows to roll back.

## Changed files

- `backend/scripts/database-fingerprint.mjs`: read-only, deterministic table integrity comparison for restore/migration checks.
- `frontend/scripts/verify-upgraded-app.mjs`: read-only browser/API checks against the local or rehearsal deployment, with ignored reports/screenshots.
- This report and documentation links: record the backup, deployed version, measured preservation and recovery steps.

No migration SQL, API payloads, production dependencies or database engine version changed in this task. The previously implemented PostgreSQL 17-compatible migrations were applied as approved.
