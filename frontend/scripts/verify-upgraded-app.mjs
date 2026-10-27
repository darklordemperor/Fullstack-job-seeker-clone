import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, expect, request } from '@playwright/test';

// Read-only checks: no registration, login/token rotation, or fixture writes to the application DB.
const target = process.argv[2];
assert(['rehearsal', 'local'].includes(target), 'Usage: node scripts/verify-upgraded-app.mjs rehearsal|local');
const frontend = target === 'local' ? 'http://127.0.0.1:4200' : 'http://127.0.0.1:24200';
const backend = target === 'local' ? 'http://127.0.0.1:8080' : 'http://127.0.0.1:28080';
const output = new URL('../tmp/upgrade-verification/', import.meta.url);
await mkdir(output, { recursive: true });
const api = await request.newContext();
const checks = [];
const pass = message => { checks.push(message); console.log(`PASS ${message}`); };
let browser;
try {
  await expect.poll(async () => {
    try { return (await api.get(`${frontend}/api/jobs`, { timeout: 3000 })).status(); } catch { return 0; }
  }, { timeout: 120000, intervals: [2000] }).toBe(200);
  const jobs = await (await api.get(`${frontend}/api/jobs`)).json();
  assert.equal(jobs.success, true);
  assert(jobs.data.content.length > 0, 'Expected preserved jobs');
  pass('Preserved jobs returned through Nginx');
  const schemaResponse = await api.get(`${backend}/api-docs`);
  assert.equal(schemaResponse.status(), 200);
  const schema = await schemaResponse.json();
  for (const path of ['/api/job-seeker/saved-jobs/page', '/api/job-seeker/interviews',
    '/api/employer/interviews/{interviewId}/outcome', '/api/employer/interviews/{interviewId}/history',
    '/api/notifications', '/api/notifications/unread-count', '/api/notifications/{id}/read',
    '/api/job-seeker/saved-searches', '/api/job-seeker/saved-searches/{searchId}/jobs',
    '/api/job-seeker/resumes', '/api/employer/applications/{applicationId}/resume', '/api/employer/analytics',
    '/api/employer/interviews/{interviewId}/scorecard', '/api/employer/interviews/{interviewId}/scorecard/finalize', '/api/employer/interviews/{interviewId}/scorecard/history']) {
    assert(schema.paths[path], `Current endpoint missing from OpenAPI: ${path}`);
  }
  pass('Current saved-jobs/interview/notification/saved-search/resume/scorecard/analytics API contracts deployed');
  for (const path of ['/api/job-seeker/saved-jobs/page', '/api/job-seeker/interviews', '/api/employer/interviews', '/api/notifications', '/api/job-seeker/saved-searches', '/api/job-seeker/resumes', '/api/employer/analytics']) {
    const response = await api.get(`${frontend}${path}`);
    assert([401, 403].includes(response.status()), `Unauthenticated request to ${path}: ${response.status()}`);
  }
  pass('Private workflow endpoints reject unauthenticated requests');
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const job = jobs.data.content[0];
  for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 320, 568]]) {
    await page.setViewportSize({ width, height });
    const response = await page.goto(`${frontend}/jobs/${job.id}`);
    assert.equal(response.status(), 200);
    await expect(page.getByRole('heading', { name: job.title, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: job.title, exact: true })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    const language = page.getByRole('button', { name: 'Choose language' });
    await language.focus(); await page.keyboard.press('Enter');
    await expect(language).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab'); await page.keyboard.press('Escape');
    await expect(language).toBeFocused();
    await expect(language).toHaveAttribute('aria-expanded', 'false');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
    await page.screenshot({ path: fileURLToPath(new URL(`${target}-${label}.png`, output)), fullPage: true });
  }
  assert.deepEqual(errors, []);
  pass('Preserved job renders after deep-link/reload at desktop and mobile sizes');
  pass('Deployed skip navigation and language disclosure preserve keyboard focus');
  for (const path of ['/job-seeker/interviews', '/job-seeker/saved-searches', '/job-seeker/resumes', '/employer/analytics']) {
    await page.goto(`${frontend}${path}`);
    await expect(page).toHaveURL(/\/auth\/login/);
  }
  pass('Interview, saved-search, resume and analytics UI routes require login');
  await writeFile(new URL(`${target}-report.json`, output), JSON.stringify({ target, status: 'passed', checks, time: new Date().toISOString() }, null, 2));
} catch (error) {
  await writeFile(new URL(`${target}-report.json`, output), JSON.stringify({ target, status: 'failed', checks, error: error.message }, null, 2));
  throw error;
} finally {
  await browser?.close();
  await api.dispose();
}
