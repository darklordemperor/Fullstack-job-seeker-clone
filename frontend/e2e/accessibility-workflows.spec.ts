import { test, expect, session } from './fixtures';

for (const [width, height] of [[320, 568], [844, 390], [1440, 900]]) {
  test(`keyboard skip, disclosures and job field names at ${width}x${height}`, async ({ page, fixtures }) => {
    await page.setViewportSize({ width, height });
    await session(page, fixtures.employer);
    await page.goto('/employer/post-job');
    await expect(page.getByRole('heading', { name: 'Post a job', exact: true })).toBeVisible();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    const bounds = await skip.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    expect(new URL(page.url()).hash).toBe('');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('textbox', { name: 'Job title', exact: true })).toBeFocused();
    for (const name of ['Job title', 'Location', 'Industry', 'Minimum salary', 'Maximum salary', 'Description']) {
      await expect(page.getByLabel(name, { exact: true })).toBeVisible();
    }
    const language = page.getByRole('button', { name: 'Choose language' });
    await language.focus(); await page.keyboard.press('Enter');
    await expect(language).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab'); await page.keyboard.press('Escape');
    await expect(language).toBeFocused();
    await expect(language).toHaveAttribute('aria-expanded', 'false');
    const account = page.getByRole('button', { name: 'My account' });
    await account.focus(); await page.keyboard.press('Enter');
    await expect(account).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab'); await page.keyboard.press('Escape');
    await expect(account).toBeFocused();
    await expect(account).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
