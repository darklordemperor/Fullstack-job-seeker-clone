import { test, expect, session, api } from './fixtures';

test.afterEach(async ({ request, fixtures }) => {
  await api(request, 'PATCH', `/jobs/${fixtures.jobId}/status`, { status: 'ACTIVE' }, fixtures.employer.tokens);
});

for (const [width, height] of [[320, 568], [768, 1024], [844, 390], [1440, 900]]) {
  test(`candidate workspace at ${width}x${height}`, async ({ page, request, fixtures }, testInfo) => {
    await page.setViewportSize({ width, height }); await session(page, fixtures.candidate);
    await api(request, 'PATCH', `/jobs/${fixtures.jobId}/status`, { status: 'ACTIVE' }, fixtures.employer.tokens);
    await api(request, 'PUT', `/job-seeker/saved-jobs/${fixtures.jobId}`, {}, fixtures.candidate.tokens);
    await page.goto('/job-seeker/saved-jobs');
    await expect(page.getByRole('heading', { name: 'Saved jobs', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View job', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View job', exact: true })).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(page.locator('main article')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath('saved-jobs.png'), fullPage: true });
    await page.getByRole('link', { name: 'View job', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/jobs/${fixtures.jobId}$`));
    await api(request, 'PATCH', `/jobs/${fixtures.jobId}/status`, { status: 'CLOSED' }, fixtures.employer.tokens);
    await page.goto('/job-seeker/saved-jobs'); await expect(page.getByText('Closed', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View job', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: /^Remove / }).click();
    await expect(page.getByRole('heading', { name: 'Start your shortlist' })).toBeVisible();
    await page.reload(); await expect(page.getByRole('heading', { name: 'Start your shortlist' })).toBeVisible();

    await page.goto('/job-seeker/profile'); await page.getByRole('button', { name: 'Edit work experience' }).click();
    const dialog = page.getByRole('dialog', { name: 'Profile editor' });
    await dialog.getByRole('button', { name: 'Add experience', exact: true }).click();
    await dialog.getByLabel('Job title for experience 1').fill('Senior Product Engineer');
    await dialog.getByLabel('Company for experience 1').fill('Example Product Company');
    await dialog.getByLabel('Start date for experience 1').fill('2022-01-01');
    // Wait for Angular to propagate the date before editing the dependent field.
    await expect(dialog.getByLabel('End date for experience 1')).toHaveAttribute('min', '2022-01-01');
    await dialog.getByLabel('End date for experience 1').fill('2021-01-01');
    await expect(dialog.getByLabel('Start date for experience 1')).toHaveValue('2022-01-01');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('end date');
    await dialog.getByLabel('End date for experience 1').fill('2025-01-01');
    expect(await dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await dialog.evaluate(el => el.scrollTop = 0);
    await page.screenshot({ path: testInfo.outputPath('work-experience.png') });
    await page.route('**/api/job-seeker/profile', async route => {
      if (route.request().method() === 'PUT') await route.fulfill({ status: 503, json: { success: false, message: 'Temporary failure', data: null } });
      else await route.continue();
    });
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible(); await expect(dialog.getByLabel('Company for experience 1')).toHaveValue('Example Product Company');
    await page.unroute('**/api/job-seeker/profile');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click(); await expect(dialog).not.toBeVisible();
    await page.reload(); await expect(page.getByRole('heading', { name: 'Senior Product Engineer', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edit work experience' }).click();
    await dialog.getByLabel('Job title for experience 1').fill('Lead Engineer');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click(); await expect(dialog).not.toBeVisible();
    await page.reload(); await expect(page.getByRole('heading', { name: 'Lead Engineer', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edit work experience' }).click();
    await dialog.getByRole('button', { name: 'Remove experience 1', exact: true }).click();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Lead Engineer', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edit work experience' }).click();
    await dialog.getByRole('button', { name: 'Remove experience 1', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click(); await expect(dialog).not.toBeVisible();
    await page.reload(); await expect(page.getByText('No work experience added yet.', { exact: true })).toBeVisible();
  });
}
