import { test, expect, api, session } from './fixtures';
import { randomUUID } from 'node:crypto';

for (const [width, height] of [[320, 568], [768, 1024], [844, 390], [1440, 900]]) {
  test(`hiring analytics filters, conversions and recovery at ${width}x${height}`, async ({ page, request, fixtures }, testInfo) => {
    await page.setViewportSize({ width, height });
    const job = await api(request, 'POST', '/jobs', { title: `Analytics Engineer ${randomUUID().slice(0, 8)}`, description: 'Analytics workflow verification.', location: 'Bangkok', salaryCurrency: 'THB' }, fixtures.employer.tokens);
    await api(request, 'PATCH', `/jobs/${job.id}/status`, { status: 'ACTIVE' }, fixtures.employer.tokens);
    const candidates = [];
    for (let i = 0; i < 2; i++) {
      const tokens = await api(request, 'POST', '/auth/register/job-seeker', { email: `analytics-${randomUUID()}@example.com`, password: 'TestPassword123!', displayName: 'Analytics Candidate' });
      candidates.push(await api(request, 'POST', '/applications', { jobId: job.id }, tokens));
    }
    await api(request, 'PATCH', `/employer/applications/${candidates[0].id}/status`, { expectedStatus: 'SUBMITTED', status: 'REVIEWING', reason: 'Interview evidence reviewed' }, fixtures.employer.tokens);
    await api(request, 'PATCH', `/employer/applications/${candidates[0].id}/status`, { expectedStatus: 'REVIEWING', status: 'HIRED', reason: 'Hiring decision' }, fixtures.employer.tokens);
    await session(page, fixtures.employer); await page.goto('/employer/dashboard');
    await page.getByRole('link', { name: 'Hiring analytics →' }).click();
    await expect(page.getByRole('heading', { name: 'Hiring analytics', exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Job', exact: true }).selectOption(job.id);
    await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`jobId=${job.id}`));
    await expect(page.getByTestId('analytics-applications')).toHaveText('2');
    await expect(page.getByTestId('analytics-conversion')).toHaveText('50%');
    await expect(page.getByTestId('analytics-median')).toContainText('days');
    await expect(page.getByRole('region', { name: 'Recorded application funnel' })).toContainText('1 · 50%');
    await expect(page.getByRole('region', { name: 'Data completeness' })).toHaveCount(0);
    await page.reload(); await expect(page.getByTestId('analytics-applications')).toHaveText('2');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('hiring-analytics.png'), fullPage: true });
    await page.getByLabel('Submitted from', { exact: true }).fill('2024-02-01');
    await page.getByLabel('Submitted through', { exact: true }).fill('2024-01-01');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.locator('main [role=alert]')).toContainText('Choose an ordered');
    await page.getByLabel('Submitted from', { exact: true }).fill('2020-01-01');
    await page.getByLabel('Submitted through', { exact: true }).fill('2020-01-31');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.getByRole('heading', { name: 'No applications in this period' })).toBeVisible();
    await expect(page.getByTestId('analytics-median')).toHaveText('—'); await expect(page.getByTestId('analytics-conversion')).toHaveText('—');
    await page.goBack(); await expect(page.getByTestId('analytics-applications')).toHaveText('2');
    await page.route('**/api/employer/analytics?*', route => route.fulfill({ status: 503, json: { success: false, message: 'Temporary analytics failure' } }));
    await page.reload(); await expect(page.getByRole('heading', { name: 'Report unavailable' })).toBeVisible();
    await expect(page.getByTestId('analytics-applications')).toHaveCount(0);
    await page.unroute('**/api/employer/analytics?*'); await page.getByRole('button', { name: 'Retry report' }).click();
    await expect(page.getByTestId('analytics-applications')).toHaveText('2');
    const unauthorized = await request.get('http://127.0.0.1:8085/api/employer/analytics', { headers: { Authorization: `Bearer ${fixtures.candidate.tokens.accessToken}` } }); expect(unauthorized.status()).toBe(403);
  });
}
