import { test, expect, session } from './fixtures';

const viewports = [
  [320, 568], [390, 844], [639, 800], [640, 800], [641, 800],
  [767, 1024], [768, 1024], [769, 1024], [844, 390],
  [1023, 768], [1024, 768], [1025, 768], [1440, 900], [1920, 1080],
];
for (const [width, height] of viewports) {
  for (const role of ['public', 'candidate', 'employer', 'admin'] as const) {
    test(`${role} routes at ${width}x${height}`, async ({ page, fixtures }, testInfo) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height });
      await session(page, role === 'public' ? undefined : fixtures[role]);
      const routes = {
        public: ['/', '/jobs', `/jobs/${fixtures.jobId}`, '/auth/login', '/auth/register-job-seeker', '/auth/register-employer'],
        candidate: ['/job-seeker/resumes', '/job-seeker/saved-searches', '/notifications', '/job-seeker/interviews', '/job-seeker/saved-jobs', '/job-seeker/profile', '/job-seeker/my-applications', '/job-seeker/settings'],
        employer: ['/notifications', '/employer/interviews', '/employer/dashboard', '/employer/analytics', '/employer/post-job', '/employer/manage-jobs', `/employer/applicants/${fixtures.jobId}`, '/employer/settings'],
        admin: ['/notifications', '/admin/dashboard', '/admin/users', '/admin/applications'],
      }[role];
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator('main').first()).toBeVisible();
        await page.waitForLoadState('networkidle');
        expect(new URL(page.url()).pathname).toBe(route);
        await expect(page.getByRole('alert')).toHaveCount(0);
        const overflow = await page.evaluate(() => {
          const width = document.documentElement.clientWidth;
          return { width, scroll: document.documentElement.scrollWidth,
            elements: [...document.querySelectorAll('main *, header *')].filter(el => {
              const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > width + 1 || r.left < -1);
            }).slice(0, 8).map(el => `${el.tagName}.${el.className}`) };
        });
        expect(overflow.scroll, `${route}: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.width + 1);
        if (route === '/job-seeker/profile') {
          const edits = page.getByRole('button', { name: /^(Edit|Add or edit|Edit work experience)$/ });
          for (let index = 0; index < await edits.count(); index++) {
            const trigger = edits.nth(index);
            await trigger.click();
            const dialog = page.getByRole('dialog', { name: 'Profile editor' });
            await expect(dialog).toBeVisible();
            expect(await dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
            const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
            await cancel.focus(); await page.keyboard.press('Tab');
            await expect(dialog.getByRole('button', { name: 'Close profile editor' })).toBeFocused();
            await page.keyboard.press('Escape');
            await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
          }
        }
        if (route === '/admin/users') {
          const trigger = page.getByRole('button', { name: 'Ban', exact: true }).first();
          await trigger.click();
          const dialog = page.getByRole('dialog', { name: 'Ban user' });
          await expect(dialog).toBeVisible();
          expect(await dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
          const bounds = await dialog.boundingBox();
          expect(bounds!.height).toBeLessThanOrEqual(height);
          await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
        }
        if (width < 1024) {
          const menu = page.getByRole('button', { name: 'Menu', exact: true });
          await menu.click();
          await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
          await expect(menu).toHaveAttribute('aria-expanded', 'true');
          await page.keyboard.press('Escape');
          await expect(menu).toBeFocused();
        }
        if ([320, 768, 1440].includes(width)) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
          await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '_') || 'home'}.png`), fullPage: true });
        }
      }
      expect(errors).toEqual([]);
    });
  }
}
