import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4207',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testMatch: /(workflows|notifications)\.spec\.ts$/, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testMatch: /(workflows|notifications)\.spec\.ts$/, use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    { command: 'node scripts/start-e2e-backend.mjs', url: 'http://127.0.0.1:8085/api/jobs', timeout: 240_000 },
    { command: 'npm run start -- --host 127.0.0.1 --port 4207 --proxy-config proxy.e2e.conf.json', url: 'http://127.0.0.1:4207', timeout: 180_000 },
  ],
});
