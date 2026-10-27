import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, expect, request } from '@playwright/test';

// Intentionally fixed to the isolated Compose project, never the development database.
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = new URL('../tmp/docker-verification/', import.meta.url);
const phase = process.argv[2];
const withPgAdmin = process.argv.includes('--pgadmin');
assert(['seed', 'verify'].includes(phase), 'Usage: node scripts/verify-docker.mjs seed|verify [--pgadmin]');
const compose = ['compose', '--env-file', 'backend/target/docker-verify.env', '-p', 'jobsdb-verification',
  '-f', 'docker-compose.yml', '-f', 'docker-compose.verify.yml'];
if (withPgAdmin) compose.push('--profile', 'tools');
const config = JSON.parse(execFileSync('docker', [...compose, 'config', '--format', 'json'], { cwd: root, encoding: 'utf8' }));
assert.equal(config.name, 'jobsdb-verification');
assert.equal(config.services.postgres.environment.POSTGRES_DB, 'jobsdb_test');
assert.equal(config.services.backend.environment.SPRING_DATASOURCE_URL, 'jdbc:postgresql://postgres:5432/jobsdb_test');
for (const volume of Object.values(config.volumes)) assert(volume.name.startsWith('jobsdb-verification_'));
for (const name of ['postgres', 'backend', 'frontend', ...(withPgAdmin ? ['pgadmin'] : [])]) {
  assert(!config.services[name].container_name, 'Container names must be project-scoped');
  assert(config.services[name].ports.every(port => port.host_ip === '127.0.0.1'));
}
const port = config.services.frontend.ports.find(port => port.target === 80).published;
const baseURL = `http://127.0.0.1:${port}`;
const client = await request.newContext({ baseURL });
const checks = [];
const pass = message => { checks.push(message); console.log(`PASS ${message}`); };
const api = async (method, path, data, tokens) => {
  const response = await client.fetch(`/api${path}`, { method, data,
    headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {} });
  assert(response.ok(), `${method} ${path}: HTTP ${response.status()}`);
  const envelope = await response.json();
  assert.equal(envelope.success, true);
  return envelope.data;
};
let browser;
try {
  await mkdir(output, { recursive: true });
  await expect.poll(async () => {
    try { return (await client.get('/api/jobs', { timeout: 4000 })).status(); } catch { return 0; }
  }, { timeout: 180000, intervals: [2000] }).toBe(200);
  pass('Nginx /api forwards to the backend');
  if (withPgAdmin) {
    const adminPort = config.services.pgadmin.ports.find(port => port.target === 80).published;
    await expect.poll(async () => {
      try { return (await client.get(`http://127.0.0.1:${adminPort}/misc/ping`, { timeout: 4000 })).status(); }
      catch { return 0; }
    }, { timeout: 180000, intervals: [2000] }).toBe(200);
    pass('pgAdmin starts with the configured email and responds to /misc/ping');
  }
  const dbVersion = execFileSync('docker', [...compose, 'exec', '-T', 'postgres', 'psql', '-U', 'jobsdb', '-d', 'jobsdb_test', '-Atc', 'SHOW server_version'], { cwd: root, encoding: 'utf8' }).trim();
  assert.match(dbVersion, /^17\./);
  const migrations = execFileSync('docker', [...compose, 'exec', '-T', 'postgres', 'psql', '-U', 'jobsdb', '-d', 'jobsdb_test', '-Atc', 'SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/);
  assert.deepEqual(migrations, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
  pass(`PostgreSQL ${dbVersion}; Flyway V1-V11 applied`);
  execFileSync('docker', [...compose, 'exec', '-T', 'frontend', 'nginx', '-t'], { cwd: root, stdio: 'pipe' });
  pass('Nginx configuration valid');
  browser = await chromium.launch();
  let state;
  if (phase === 'seed') {
    const register = async role => {
      const email = `docker-${randomUUID()}@example.com`, password = `Verify-${randomUUID()}!`;
      return { email, password, tokens: await api('POST', `/auth/register/${role}`, { email, password, displayName: 'Docker Verification' }) };
    };
    const employer = await register('employer'), candidate = await register('job-seeker');
    await api('PUT', '/employer/profile', { companyName: 'Container Verification', location: 'Bangkok', description: 'Isolated runtime test', website: 'https://example.com' }, employer.tokens);
    const title = `Container QA ${randomUUID().slice(0, 8)}`;
    const savedSearch = await api('POST', '/job-seeker/saved-searches', { name: 'Container search', query: title, salaryMin: 50000, currency: 'THB' }, candidate.tokens);
    const job = await api('POST', '/jobs', { title, description: 'Production container verification.', location: 'Bangkok', salaryMin: 50000, salaryMax: 80000, salaryCurrency: 'THB' }, employer.tokens);
    await api('PATCH', `/jobs/${job.id}/status`, { status: 'ACTIVE' }, employer.tokens);
    const candidateInbox = await api('GET', '/notifications', undefined, candidate.tokens);
    assert.equal(candidateInbox.content.length, 1);
    assert.equal(candidateInbox.content[0].kind, 'JOB_MATCH');
    assert.equal(candidateInbox.content[0].href, `/jobs/${job.id}`);
    pass('Saved search produces a private job-match notification through Nginx');
    await api('PUT', '/job-seeker/profile', { fullName: 'Container Candidate', phone: '0812345678', summary: 'Persist across container recreation', skills: [{ name: 'TypeScript' }], workExperiences: [], educations: [], languages: [], licenses: [], resumeUrl: 'https://example.com/resume.pdf' }, candidate.tokens);
    const resumeBytes = Buffer.from('%PDF-1.4\n% Container byte-preservation fixture\n%%EOF\n');
    const resumeUpload = await client.post('/api/job-seeker/resumes', {
      headers: { Authorization: `Bearer ${candidate.tokens.accessToken}` },
      multipart: { file: { name: 'submitted.pdf', mimeType: 'application/pdf', buffer: resumeBytes } },
    });
    assert(resumeUpload.ok(), `Resume upload: HTTP ${resumeUpload.status()}`);
    const resumeId = (await resumeUpload.json()).data.id;
    const application = await api('POST', '/applications', { jobId: job.id }, candidate.tokens);
    const submitted = await client.get(`/api/employer/applications/${application.id}/resume`, { headers: { Authorization: `Bearer ${employer.tokens.accessToken}` } });
    assert(submitted.ok()); assert.deepEqual(await submitted.body(), resumeBytes);
    assert.match(submitted.headers()['cache-control'], /no-store/);
    assert.match(submitted.headers()['content-disposition'], /^attachment;/);
    assert.equal((await client.get(`/api/job-seeker/resumes/${resumeId}/file`)).status(), 401);
    const replacement = await client.post('/api/job-seeker/resumes', {
      headers: { Authorization: `Bearer ${candidate.tokens.accessToken}` },
      multipart: { file: { name: 'replacement.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% New version\n%%EOF\n') } },
    });
    assert(replacement.ok());
    const replacementId = (await replacement.json()).data.id;
    pass('Private PDF upload, immutable submitted attachment and authenticated no-store download through Nginx');
    const inbox = await api('GET', '/notifications?unreadOnly=true', undefined, employer.tokens);
    assert.equal(inbox.content.length, 1);
    const notification = inbox.content[0];
    assert.equal(notification.kind, 'NEW_APPLICATION');
    assert(notification.href.includes(application.id));
    const readNotification = await api('PATCH', `/notifications/${notification.id}/read`, {}, employer.tokens);
    assert(readNotification.readAt);
    assert.equal((await api('GET', '/notifications/unread-count', undefined, employer.tokens)).unreadCount, 0);
    pass('Private application notification created and marked read through Nginx');
    const start = Date.now() + 86400000;
    const interview = await api('POST', `/employer/applications/${application.id}/interviews`, { mode: 'ONLINE', location: 'https://example.com/interview', timezone: 'UTC', slots: [{ startsAt: new Date(start).toISOString(), endsAt: new Date(start + 3600000).toISOString() }] }, employer.tokens);
    const scorecard = await api('PUT', `/employer/interviews/${interview.id}/scorecard`, { expectedVersion: 0, feedback: { technicalSkills: 4, strengths: 'Container evidence' } }, employer.tokens);
    assert.equal(scorecard.version, 1);
    const candidateNotifications = await api('GET', '/notifications', undefined, candidate.tokens);
    pass('Private scorecard draft and revision saved through Nginx');
    const imagePage = await browser.newPage({ viewport: { width: 64, height: 64 } });
    await imagePage.setContent('<html style="background:#2563eb"><body></body></html>');
    const png = await imagePage.screenshot();
    await imagePage.close();
    const uploaded = await client.post('/api/job-seeker/profile/image', {
      headers: { Authorization: `Bearer ${candidate.tokens.accessToken}` },
      multipart: { file: { name: 'verification.png', mimeType: 'image/png', buffer: png } },
    });
    assert(uploaded.ok(), `Avatar upload: HTTP ${uploaded.status()}`);
    const avatarUrl = (await uploaded.json()).data.profileImageUrl;
    assert.match(avatarUrl, /^\/uploads\/profile-images\//);
    const avatar = await client.get(avatarUrl);
    assert.equal(avatar.status(), 200);
    const bytes = await avatar.body();
    assert.equal(bytes.readUInt32BE(16), 256);
    assert.equal(bytes.readUInt32BE(20), 256);
    state = { candidate: { email: candidate.email, password: candidate.password }, employer: { email: employer.email, password: employer.password }, resumeId, replacementId, resumeHash: createHash('sha256').update(resumeBytes).digest('hex'), savedSearchId: savedSearch.id, notificationId: notification.id, notificationReadAt: readNotification.readAt, jobId: job.id, applicationId: application.id, title, avatarUrl, avatarHash: createHash('sha256').update(bytes).digest('hex') };
    state.interviewId = interview.id;
    state.candidateNotificationCount = candidateNotifications.totalElements;
    await writeFile(new URL('state.json', output), JSON.stringify(state, null, 2));
    pass('Registration, job publication, application and 256x256 avatar through Nginx');
  } else {
    state = JSON.parse(await readFile(new URL('state.json', output), 'utf8'));
    const tokens = await api('POST', '/auth/login', state.candidate);
    const profile = await api('GET', '/job-seeker/profile', undefined, tokens);
    assert.equal(profile.fullName, 'Container Candidate');
    assert.equal(profile.profileImageUrl, state.avatarUrl);
    const applications = await api('GET', '/applications/my', undefined, tokens);
    assert(applications.some(item => item.id === state.applicationId));
    const avatar = await client.get(state.avatarUrl);
    assert.equal(avatar.status(), 200);
    assert.equal(createHash('sha256').update(await avatar.body()).digest('hex'), state.avatarHash);
    pass('Account, profile, application and identical avatar bytes persisted');
    const employerTokens = await api('POST', '/auth/login', state.employer);
    const versions = await api('GET', '/job-seeker/resumes', undefined, tokens);
    assert.equal(versions.find(item => item.id === state.resumeId)?.attached, true);
    assert.equal(versions.find(item => item.current)?.id, state.replacementId);
    for (const [prefix, auth] of [['', tokens], ['employer/', employerTokens]]) {
      const submitted = await client.get(`/api/${prefix}applications/${state.applicationId}/resume`, { headers: { Authorization: `Bearer ${auth.accessToken}` } });
      assert(submitted.ok()); assert.equal(createHash('sha256').update(await submitted.body()).digest('hex'), state.resumeHash);
    }
    const retained = await client.delete(`/api/job-seeker/resumes/${state.resumeId}`, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
    assert.equal(retained.status(), 409);
    pass('Resume versions, selection, retention and identical submitted PDF bytes persisted after recreation');
    const inbox = await api('GET', '/notifications', undefined, employerTokens);
    assert.equal(inbox.content.find(item => item.id === state.notificationId)?.readAt, state.notificationReadAt);
    assert.equal((await api('GET', '/notifications/unread-count', undefined, employerTokens)).unreadCount, 0);
    const candidateInbox = await api('GET', '/notifications', undefined, tokens);
    assert.equal(candidateInbox.totalElements, state.candidateNotificationCount);
    assert(candidateInbox.content.some(item => item.kind === 'JOB_MATCH'));
    assert((await api('GET', '/job-seeker/saved-searches', undefined, tokens)).some(item=>item.id===state.savedSearchId));
    assert.equal((await api('GET', `/job-seeker/saved-searches/${state.savedSearchId}/jobs`, undefined, tokens)).content[0].id, state.jobId);
    await api('PATCH', `/jobs/${state.jobId}/status`, { status: 'ACTIVE' }, employerTokens);
    assert.equal((await api('GET', '/notifications', undefined, tokens)).totalElements, state.candidateNotificationCount);
    pass('Saved criteria, matches and publication deduplication persisted after recreation');
    pass('Private inbox and original read timestamp persisted after recreation');
    const cardPath = `/employer/interviews/${state.interviewId}/scorecard`;
    const scorecard = await api('GET', cardPath, undefined, employerTokens);
    assert.equal(scorecard.version, 1); assert.equal(scorecard.feedback.strengths, 'Container evidence');
    const history = await api('GET', cardPath + '/history', undefined, employerTokens);
    assert.equal(history.totalElements, 1); assert.deepEqual(history.content[0], scorecard);
    const denied = await client.get('/api' + cardPath, { headers: { Authorization: `Bearer ${tokens.accessToken}` } }); assert.equal(denied.status(), 403);
    pass('Private scorecard and identical revision persisted after container recreation');
  }
  const analyticsTokens = await api('POST', '/auth/login', state.employer);
  const analytics = await api('GET', `/employer/analytics?jobId=${state.jobId}`, undefined, analyticsTokens);
  assert.equal(analytics.applications, 1); assert.equal(analytics.applicationsWithoutSubmissionHistory, 0);
  assert.equal(analytics.funnel[2].conversionPercent, 0); assert.equal(analytics.timeToHire.medianDays, null);
  const analyticsPage = await browser.newPage();
  await analyticsPage.addInitScript(tokens => localStorage.setItem('jobsdb-session', JSON.stringify(tokens)), analyticsTokens);
  const analyticsErrors = []; analyticsPage.on('pageerror', error => analyticsErrors.push(error.message));
  for (const [width, height] of [[1440, 900], [320, 568]]) {
    await analyticsPage.setViewportSize({ width, height });
    await analyticsPage.goto(`${baseURL}/employer/analytics?jobId=${state.jobId}`);
    await expect(analyticsPage.getByTestId('analytics-applications')).toHaveText('1');
    await expect(analyticsPage.getByTestId('analytics-median')).toHaveText('—');
    assert(await analyticsPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Analytics horizontal overflow');
    await analyticsPage.screenshot({ path: fileURLToPath(new URL(`${phase}-analytics-${width}.png`, output)), fullPage: true });
  }
  assert.deepEqual(analyticsErrors, []); await analyticsPage.close();
  pass('Production analytics returns accurate private aggregates and renders at desktop/mobile widths');
  const scorecardPage = await browser.newPage();
  const scorecardTokens = await api('POST', '/auth/login', state.employer);
  await scorecardPage.addInitScript(tokens => localStorage.setItem('jobsdb-session', JSON.stringify(tokens)), scorecardTokens);
  const scorecardErrors = []; scorecardPage.on('pageerror', error => scorecardErrors.push(error.message));
  for (const [width, height] of [[1440, 900], [320, 568]]) {
    await scorecardPage.setViewportSize({ width, height });
    await scorecardPage.goto(`${baseURL}/employer/interviews/${state.interviewId}/scorecard`);
    await expect(scorecardPage.getByRole('heading', { name: 'Interview scorecard', exact: true })).toBeVisible();
    await expect(scorecardPage.locator('textarea[name=strengths]')).toHaveValue('Container evidence');
    await expect(scorecardPage.getByRole('button', { name: 'View scorecard revision 1' })).toBeVisible();
    assert(await scorecardPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Scorecard horizontal overflow');
    await scorecardPage.screenshot({ path: fileURLToPath(new URL(`${phase}-scorecard-${width}.png`, output)), fullPage: true });
  }
  assert.deepEqual(scorecardErrors, []); await scorecardPage.close();
  pass('Production scorecard deep link renders persisted feedback and history at desktop/mobile widths');
  const accessiblePage = await browser.newPage();
  await accessiblePage.addInitScript(tokens => localStorage.setItem('jobsdb-session', JSON.stringify(tokens)), scorecardTokens);
  for (const [width, height] of [[1440, 900], [320, 568]]) {
    await accessiblePage.setViewportSize({ width, height });
    await accessiblePage.goto(`${baseURL}/employer/post-job`);
    await expect(accessiblePage.getByRole('heading', { name: 'Post a job', exact: true })).toBeVisible();
    await accessiblePage.keyboard.press('Tab');
    await expect(accessiblePage.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await accessiblePage.keyboard.press('Enter');
    await expect(accessiblePage.getByRole('main')).toBeFocused();
    await accessiblePage.keyboard.press('Tab');
    await expect(accessiblePage.getByLabel('Job title', { exact: true })).toBeFocused();
    for (const name of ['Job title', 'Location', 'Industry', 'Minimum salary', 'Maximum salary', 'Description']) {
      await expect(accessiblePage.getByLabel(name, { exact: true })).toBeVisible();
    }
    const account = accessiblePage.getByRole('button', { name: 'My account' });
    await account.focus(); await accessiblePage.keyboard.press('Enter');
    await expect(account).toHaveAttribute('aria-expanded', 'true');
    await accessiblePage.keyboard.press('Tab'); await accessiblePage.keyboard.press('Escape');
    await expect(account).toBeFocused();
    await expect(account).toHaveAttribute('aria-expanded', 'false');
    assert(await accessiblePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Post job horizontal overflow');
    await accessiblePage.screenshot({ path: fileURLToPath(new URL(`${phase}-accessibility-${width}.png`, output)), fullPage: true });
  }
  await accessiblePage.close();
  pass('Production skip navigation, job labels and account keyboard focus at desktop/mobile widths');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const deepLink = await page.goto(`${baseURL}/jobs/${state.jobId}`);
  assert.equal(deepLink.status(), 200);
  await expect(page.getByRole('heading', { name: state.title, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: state.title, exact: true })).toBeVisible();
  await page.screenshot({ path: fileURLToPath(new URL(`${phase}-desktop.png`, output)), fullPage: true });
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.getByRole('heading', { name: state.title, exact: true })).toBeVisible();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Mobile horizontal overflow');
  await page.screenshot({ path: fileURLToPath(new URL(`${phase}-mobile.png`, output)), fullPage: true });
  assert.deepEqual(errors, []);
  pass('Production Angular deep link, reload, desktop/mobile layout and no page errors');
  const asset = await page.locator('script[src]').first().getAttribute('src');
  const assetResponse = await client.get(new URL(asset, baseURL).href);
  assert.equal(assetResponse.status(), 200);
  assert.match(assetResponse.headers()['cache-control'], /immutable/);
  pass('Production JavaScript served with immutable cache header');
  await writeFile(new URL(`${phase}-report.json`, output), JSON.stringify({ phase, status: 'passed', time: new Date().toISOString(), baseURL, checks }, null, 2));
} catch (error) {
  await writeFile(new URL(`${phase}-report.json`, output), JSON.stringify({ phase, status: 'failed', time: new Date().toISOString(), baseURL, checks, error: error instanceof Error ? error.message : String(error) }, null, 2));
  throw error;
} finally {
  await browser?.close();
  await client.dispose();
}
