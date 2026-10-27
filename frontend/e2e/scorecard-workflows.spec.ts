import { test, expect, api, session } from './fixtures';
import { randomUUID } from 'node:crypto';

for (const [width, height] of [[320, 568], [768, 1024], [844, 390], [1440, 900]]) {
  test(`private scorecard drafts, conflicts and history at ${width}x${height}`, async ({ page, request, fixtures }, testInfo) => {
    await page.setViewportSize({ width, height });
    const candidate = { email: `scorecard-${randomUUID()}@example.com`, password: 'TestPassword123!', tokens: fixtures.candidate.tokens };
    candidate.tokens = await api(request, 'POST', '/auth/register/job-seeker', { email: candidate.email, password: candidate.password, displayName: 'Scorecard Candidate' });
    const application = await api(request, 'POST', '/applications', { jobId: fixtures.jobId }, candidate.tokens);
    const start = Date.now() + 86400000;
    const interview = await api(request, 'POST', `/employer/applications/${application.id}/interviews`, { mode: 'ONLINE', location: 'https://example.com/interview', timezone: 'Asia/Bangkok', slots: [{ startsAt: new Date(start).toISOString(), endsAt: new Date(start + 3600000).toISOString() }] }, fixtures.employer.tokens);
    const path = `/employer/interviews/${interview.id}/scorecard`;
    await session(page, fixtures.employer); await page.goto('/employer/interviews');
    await page.locator(`a[href="${path}"]`).click();
    await expect(page.getByRole('heading', { name: 'Interview scorecard', exact: true })).toBeVisible();
    await expect(page.getByText('No saved feedback yet.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review & finalize' })).toBeDisabled();
    await page.getByRole('combobox', { name: 'Technical skills', exact: true }).selectOption({ label: '4 / 5' });
    await page.getByRole('combobox', { name: 'Communication', exact: true }).selectOption({ label: '3 / 5' });
    await page.getByRole('combobox', { name: 'Problem-solving', exact: true }).selectOption({ label: '5 / 5' });
    const strengths = page.locator('textarea[name=strengths]');
    await strengths.fill('Explained clear tradeoffs with specific examples.');
    await page.getByRole('combobox', { name: 'Overall recommendation', exact: true }).selectOption('HIRE');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByText('Draft saved privately.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View scorecard revision 1' })).toBeVisible();
    const first = await api(request, 'GET', path, undefined, fixtures.employer.tokens);
    await api(request, 'PUT', path, { expectedVersion: 1, feedback: { ...first.feedback, concerns: 'Another tab saved this note.' } }, fixtures.employer.tokens);
    await strengths.fill('My unsaved feedback'); await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.locator('main [role=alert]')).toContainText('Scorecard changed'); await expect(strengths).toHaveValue('My unsaved feedback');
    await page.getByRole('button', { name: 'Reload saved version' }).click();
    await expect(page.getByRole('dialog')).toBeVisible(); await page.getByRole('button', { name: 'Keep editing' }).click(); await expect(strengths).toHaveValue('My unsaved feedback');
    await page.getByRole('button', { name: 'Reload saved version' }).click(); await page.getByRole('button', { name: 'Discard & reload' }).click();
    await expect(page.locator('textarea[name=concerns]')).toHaveValue('Another tab saved this note.');
    await page.getByRole('button', { name: 'View scorecard revision 1' }).click();
    await expect(page.getByRole('dialog')).toContainText('Explained clear tradeoffs');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('scorecard-revision.png'), fullPage: true });
    await page.getByRole('button', { name: 'Close revision' }).click();
    await expect(page.getByRole('button', { name: 'View scorecard revision 1' })).toBeFocused();
    await expect(page.getByRole('button', { name: /Error Scorecard changed/ })).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: testInfo.outputPath('scorecard-workspace.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const premature = await request.post(`http://127.0.0.1:8085/api${path}/finalize`, { headers: { Authorization: `Bearer ${fixtures.employer.tokens.accessToken}` }, data: { expectedVersion: 2, feedback: first.feedback } }); expect(premature.status()).toBe(409);
    const denied = await request.get(`http://127.0.0.1:8085/api${path}`, { headers: { Authorization: `Bearer ${candidate.tokens.accessToken}` } }); expect(denied.status()).toBe(403);
    const candidateView = await api(request, 'GET', `/job-seeker/interviews/${interview.id}`, undefined, candidate.tokens); expect(JSON.stringify(candidateView)).not.toContain('feedback');
    await api(request, 'POST', `/employer/interviews/${interview.id}/cancel`, { expectedVersion: 0 }, fixtures.employer.tokens);
    await page.reload(); await expect(page.getByText('Existing feedback is read-only.', { exact: false })).toBeVisible(); await expect(strengths).toBeDisabled();
  });
}

