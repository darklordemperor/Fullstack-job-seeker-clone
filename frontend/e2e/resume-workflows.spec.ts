import { test, expect, api, session } from './fixtures';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Minimal valid, one-page PDF. Versions differ in a comment; byte equality checks preservation.
function pdf(marker: string): Buffer {
  let source = `%PDF-1.4\n%${marker}\n`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>'];
  const offsets = [0];
  objects.forEach((body, i) => { offsets.push(Buffer.byteLength(source)); source += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = Buffer.byteLength(source);
  source += `xref\n0 4\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(source);
}
for (const [width, height] of [[320, 568], [768, 1024], [844, 390], [1440, 900]]) {
  test(`private résumé versions and submitted bytes at ${width}x${height}`, async ({ page, request, fixtures }, testInfo) => {
    await page.setViewportSize({ width, height });
    const candidate = { email: `resume-${randomUUID()}@example.com`, password: 'TestPassword123!', tokens: fixtures.candidate.tokens };
    candidate.tokens = await api(request, 'POST', '/auth/register/job-seeker', { email: candidate.email, password: candidate.password, displayName: 'Résumé Candidate' });
    await session(page, candidate); await page.goto('/job-seeker/profile');
    await page.getByRole('link', { name: 'Manage résumé PDFs →' }).click();
    await expect(page.getByRole('heading', { name: 'Your résumés', exact: true })).toBeVisible();
    await expect(page.getByText('Your next application starts here')).toBeVisible();
    const input = page.getByLabel('Choose PDF'); const upload = page.getByRole('button', { name: 'Upload & use for applications', exact: true });
    await input.setInputFiles({ name: 'bad.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF') }); await upload.click();
    await expect(page.locator('main [role=alert]')).toContainText('PDF signature');
    const first = pdf('original'), second = pdf('replacement');
    await input.setInputFiles({ name: 'original.pdf', mimeType: 'application/pdf', buffer: first }); await upload.click();
    await expect(page.getByRole('heading', { name: 'original.pdf', exact: true })).toBeVisible();
    await expect(page.getByText('Selected for applications', { exact: true })).toBeVisible();
    await page.goto(`/jobs/${fixtures.jobId}`); await page.getByRole('button', { name: 'Apply now', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Already applied', exact: true })).toBeVisible();
    const applications = await api(request, 'GET', '/applications/my/page', undefined, candidate.tokens);
    const application = applications.content.find((a: { jobId: string }) => a.jobId === fixtures.jobId);
    await page.goto('/job-seeker/resumes');
    await input.setInputFiles({ name: 'replacement.pdf', mimeType: 'application/pdf', buffer: second });
    await page.route('**/api/job-seeker/resumes', route => route.request().method() === 'POST'
      ? route.fulfill({ status: 503, json: { success: false, message: 'Temporary upload failure' } }) : route.continue());
    await upload.click(); await expect(page.locator('main [role=alert]')).toContainText('Temporary upload failure');
    await expect(page.getByText(/replacement.pdf ·/)).toBeVisible(); await page.unroute('**/api/job-seeker/resumes'); await upload.click();
    await expect(page.getByRole('heading', { name: 'replacement.pdf', exact: true })).toBeVisible();
    await expect(input).toHaveValue('');
    const original = page.locator('article').filter({ has: page.getByRole('heading', { name: 'original.pdf', exact: true }) });
    await expect(original.getByText('Retained with application')).toBeVisible(); await expect(original.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Error Temporary upload failure', exact: true })).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('resume-versions.png'), fullPage: true });
    await original.getByRole('button', { name: 'Use this version', exact: true }).click(); await expect(original.getByText('Selected for applications')).toBeVisible();
    await page.getByRole('button', { name: 'Stop attaching PDF', exact: true }).click();
    await expect(page.getByText('No PDF selected for future applications.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click(); await page.getByRole('button', { name: 'Keep résumé', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'replacement.pdf', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click(); await page.getByRole('button', { name: 'Confirm delete', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'replacement.pdf', exact: true })).toHaveCount(0);
    await page.reload(); await expect(original.getByRole('heading', { name: 'original.pdf', exact: true })).toBeVisible();
    await page.goto(`/job-seeker/my-applications?applicationId=${application.id}`);
    const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download PDF: original.pdf', exact: true }).click();
    const download = await downloadPromise; expect(download.suggestedFilename()).toBe('original.pdf'); expect(await readFile((await download.path())!)).toEqual(first);
    await session(page, fixtures.employer); await page.goto(`/employer/applicants/${fixtures.jobId}?applicationId=${application.id}`);
    const employerDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download PDF: original.pdf', exact: true }).click();
    expect(await readFile((await (await employerDownload).path())!)).toEqual(first);
    const denied = await request.get(`http://127.0.0.1:8085/api/applications/${application.id}/resume`, { headers: { Authorization: `Bearer ${fixtures.candidate.tokens.accessToken}` } }); expect(denied.status()).toBe(404);
  });
}
