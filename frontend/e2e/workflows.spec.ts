import { test, expect, session, api } from './fixtures';
import { randomUUID } from 'node:crypto';

test('keyboard sign-in, mobile navigation and logout', async ({ page, fixtures }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/auth/login');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('valid email');
  await page.getByLabel('Email', { exact: true }).fill(fixtures.employer.email);
  await page.getByLabel('Password', { exact: true }).fill(fixtures.employer.password);
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL(/\/employer\/dashboard$/);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const menu = page.getByRole('navigation', { name: 'Mobile navigation' });
  await menu.getByRole('link', { name: 'Manage jobs', exact: true }).click();
  await expect(page).toHaveURL(/\/employer\/manage-jobs$/);
  await expect(menu).not.toBeVisible();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await menu.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('jobsdb-session'))).toBeNull();
});

test('candidate save, application and employer review persist with private notes', async ({ browser, fixtures, request }) => {
  // Later submissions move the original candidate off page one. Review must use
  // the stable application deep link, independent of worker/test execution order.
  for (let index = 0; index < 8; index++) {
    const tokens = await api(request, 'POST', '/auth/register/job-seeker', {
      email: `pagination-${randomUUID()}@example.com`, password: 'TestPassword123!', displayName: 'Pagination candidate',
    });
    await api(request, 'POST', '/applications', { jobId: fixtures.jobId }, tokens);
  }
  const firstPage = await api(request, 'GET', `/employer/jobs/${fixtures.jobId}/applicants/page?page=0&size=8`, undefined, fixtures.employer.tokens);
  expect(firstPage.content.map((item: { id: string }) => item.id)).not.toContain(fixtures.applicationId);
  const candidateContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const employerContext = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const candidate = await candidateContext.newPage(), employer = await employerContext.newPage();
  try {
    await session(candidate, fixtures.candidate); await session(employer, fixtures.employer);
    await candidate.goto(`http://127.0.0.1:4207/jobs/${fixtures.jobId}`);
    await expect(candidate.getByRole('button', { name: 'Already applied' })).toBeDisabled();
    await candidate.getByRole('button', { name: 'Save job', exact: true }).click();
    await expect(candidate.getByRole('button', { name: 'Remove saved job', exact: true })).toBeEnabled();
    await candidate.reload();
    await candidate.getByRole('button', { name: 'Remove saved job', exact: true }).click();
    await expect(candidate.getByRole('button', { name: 'Save job', exact: true })).toBeEnabled();
    await employer.goto(`http://127.0.0.1:4207/employer/applicants/${fixtures.jobId}?applicationId=${fixtures.applicationId}`);
    await expect(employer.getByRole('heading', { name: 'QA Candidate', exact: true })).toBeVisible();
    await expect(employer.getByText('Original submitted profile for browser verification.')).toBeVisible();
    await employer.getByLabel('Next stage').selectOption('REVIEWING');
    await employer.getByLabel('Internal note').fill('Private browser review note');
    await employer.getByRole('button', { name: 'Update stage' }).click();
    await expect(employer.getByText('Private browser review note', { exact: true })).toBeVisible();
    const own = await api(request, 'GET', `/applications/${fixtures.applicationId}`, undefined, fixtures.candidate.tokens);
    expect(own.application.status).toBe('REVIEWING');
    expect(JSON.stringify(own)).not.toContain('Private browser review note');
    await candidate.goto('http://127.0.0.1:4207/job-seeker/my-applications');
    await expect(candidate.getByText('REVIEWING', { exact: true })).toBeVisible();
  } finally { await candidateContext.close(); await employerContext.close(); }
});

test('job list handles loading, failure, retry and empty results', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/jobs?**', async route => {
    await gate;
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Test unavailable', data: null }) });
  });
  await page.goto('/jobs');
  await expect(page.getByText(/Loading jobs/)).toBeVisible();
  release();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await page.unroute('**/api/jobs?**');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).not.toBeVisible();
  await page.goto('/jobs?q=qa-no-matches-938017531');
  await expect(page.getByText('No matching jobs found')).toBeVisible();
});

test('employer publishes and a newly registered candidate applies and saves settings', async ({ page, browser, fixtures }) => {
  await session(page, fixtures.employer);
  await page.goto('/employer/post-job');
  const title = `Browser published ${randomUUID().slice(0, 8)}`;
  await page.getByPlaceholder('Job title', { exact: true }).fill(title);
  await page.getByPlaceholder('Location', { exact: true }).fill('Bangkok');
  await page.getByPlaceholder('Description', { exact: true }).fill('A real browser-created job for application verification.');
  const created = page.waitForResponse(response => response.url().endsWith('/api/jobs') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Publish job', exact: true }).click();
  const job = (await (await created).json()).data;
  await expect(page.getByText('Job published for job seekers', { exact: true })).toBeVisible();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const candidate = await context.newPage();
  try {
    await candidate.goto('http://127.0.0.1:4207/auth/register-job-seeker');
    await candidate.getByLabel('Full name', { exact: true }).fill('Browser Applicant');
    await candidate.getByLabel('Email', { exact: true }).fill(`browser-${randomUUID()}@example.com`);
    await candidate.getByLabel('Password', { exact: true }).fill('TestPassword123!');
    await candidate.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(candidate).toHaveURL(/\/jobs$/);
    await candidate.goto(`http://127.0.0.1:4207/jobs/${job.id}`);
    await candidate.getByRole('button', { name: 'Apply now', exact: true }).click();
    await expect(candidate.getByRole('button', { name: 'Already applied', exact: true })).toBeDisabled();
    await candidate.reload();
    await expect(candidate.getByRole('button', { name: 'Already applied', exact: true })).toBeDisabled();
    await candidate.goto('http://127.0.0.1:4207/job-seeker/settings');
    await candidate.getByLabel('Display name', { exact: true }).fill('Updated browser applicant');
    await candidate.getByLabel('Contact email', { exact: true }).fill('contact-browser@example.com');
    await candidate.getByRole('button', { name: 'Save settings', exact: true }).click();
    await expect(candidate.getByText('Settings saved', { exact: true })).toBeVisible();
    await candidate.reload();
    await expect(candidate.getByLabel('Display name', { exact: true })).toHaveValue('Updated browser applicant');
    await expect(candidate.getByLabel('Contact email', { exact: true })).toHaveValue('contact-browser@example.com');
  } finally { await context.close(); }
});

test('admin ban dialog records moderation and unban restores access', async ({ page, request, fixtures }) => {
  const email = `moderation-${randomUUID()}@example.com`;
  const tokens = await api(request, 'POST', '/auth/register/job-seeker', { email, password: 'TestPassword123!', displayName: 'Moderation target' });
  await session(page, fixtures.admin);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/users');
  const row = page.locator('section > div').filter({ has: page.getByText(email, { exact: true }) });
  await row.getByRole('button', { name: 'Ban', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Ban user' });
  await expect(dialog.getByRole('button', { name: 'Ban user', exact: true })).toBeDisabled();
  await dialog.getByPlaceholder('Reason', { exact: true }).fill('Browser moderation verification');
  await dialog.getByRole('button', { name: 'Ban user', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(row.getByRole('button', { name: 'Unban', exact: true })).toBeVisible();
  const denied = await request.get('http://127.0.0.1:8085/api/job-seeker/settings', { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
  expect(denied.status()).toBe(401);
  await row.getByRole('button', { name: 'Unban', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Ban', exact: true })).toBeVisible();
  await api(request, 'GET', '/job-seeker/settings', undefined, tokens);
});
