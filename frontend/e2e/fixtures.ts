import { test as base, expect, APIRequestContext, Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

type Tokens = { accessToken: string; refreshToken: string; tokenType: 'Bearer' };
type Account = { email: string; password: string; tokens: Tokens };
type Fixtures = { employer: Account; candidate: Account; admin: Account; jobId: string; applicationId: string };

export async function api(request: APIRequestContext, method: string, path: string, data?: unknown, tokens?: Tokens) {
  const response = await request.fetch(`http://127.0.0.1:8085/api${path}`, {
    method, data, headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
  });
  expect(response.ok(), `${method} ${path}: ${response.status()}`).toBeTruthy();
  return (await response.json()).data;
}
export async function session(page: Page, account?: Account) {
  await page.addInitScript(tokens => {
    localStorage.removeItem('jobsdb-session');
    if (tokens) localStorage.setItem('jobsdb-session', JSON.stringify(tokens));
  }, account?.tokens);
}
export const test = base.extend<{}, { fixtures: Fixtures }>({
  fixtures: [async ({ playwright }, use) => {
    const request = await playwright.request.newContext();
    const register = async (role: string): Promise<Account> => {
      const email = `qa-${randomUUID()}@example.com`, password = 'TestPassword123!';
      return { email, password, tokens: await api(request, 'POST', `/auth/register/${role}`, { email, password, displayName: 'QA Example' }) };
    };
    const employer = await register('employer'), candidate = await register('job-seeker');
    const admin = { email: 'admin@jobsdb.local', password: 'password', tokens: await api(request, 'POST', '/auth/login', { email: 'admin@jobsdb.local', password: 'password' }) };
    await api(request, 'PUT', '/employer/profile', { companyName: 'QA Product Company', location: 'Bangkok', description: 'A product team', website: 'https://example.com' }, employer.tokens);
    const job = await api(request, 'POST', '/jobs', { title: `QA Engineer ${randomUUID().slice(0, 8)}`, description: 'Build accessible and reliable applications.', location: 'Bangkok', salaryMin: 50000, salaryMax: 80000, salaryCurrency: 'THB' }, employer.tokens);
    await api(request, 'PATCH', `/jobs/${job.id}/status`, { status: 'ACTIVE' }, employer.tokens);
    await api(request, 'PUT', '/job-seeker/profile', { fullName: 'QA Candidate', phone: '0812345678', summary: 'Original submitted profile for browser verification.', skills: [{ name: 'TypeScript' }], workExperiences: [], educations: [], languages: [], licenses: [], resumeUrl: 'https://example.com/resume.pdf' }, candidate.tokens);
    const application = await api(request, 'POST', '/applications', { jobId: job.id }, candidate.tokens);
    await use({ employer, candidate, admin, jobId: job.id, applicationId: application.id });
    await request.dispose();
  }, { scope: 'worker' }],
});
export { expect };
