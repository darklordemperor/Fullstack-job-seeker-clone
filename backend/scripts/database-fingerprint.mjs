import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Read-only integrity check for local upgrade rehearsals. Never emits row contents.
const [container, database, baselinePath] = process.argv.slice(2);
assert(container && ['jobsdb', 'jobsdb_test'].includes(database),
  'Usage: node database-fingerprint.mjs <container> jobsdb|jobsdb_test [baseline.json]');
const query = sql => execFileSync('docker', ['exec', container, 'psql', '-X', '-v', 'ON_ERROR_STOP=1',
  '-U', 'jobsdb', '-d', database, '-Atc', sql], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
const baseline = baselinePath ? JSON.parse(readFileSync(baselinePath, 'utf8')) : null;
const tables = baseline ? baseline.tables.map(table => table.table) : JSON.parse(query(
  "SELECT coalesce(json_agg(tablename ORDER BY tablename),'[]') FROM pg_tables WHERE schemaname='public' AND tablename <> 'flyway_schema_history'"));
const results = tables.map(table => {
  assert.match(table, /^[a-z_][a-z0-9_]*$/, 'Unexpected table identifier');
  return JSON.parse(query(`SELECT json_build_object('table','${table}','rows',count(*),'md5',
    md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''))) FROM public."${table}" t`));
});
if (baseline) assert.deepEqual(results, baseline.tables, 'Pre-upgrade table contents changed');
const versions = query('SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank').split(/\r?\n/);
console.log(JSON.stringify({ database, versions, tables: results, ...(baseline ? { preserved: true } : {}) }, null, 2));
