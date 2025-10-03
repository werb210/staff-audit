import { test, expect } from '@playwright/test';

const BASE = process.env.STAFF_URL || 'http://127.0.0.1:5000';

test('Portal page mounts without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle' });

  // fast readiness probe
  const ready = await page.evaluate(() => (window as any).__APP_READY__ === true);
  expect(ready).toBeTruthy();

  // fail on hard console errors (ignore source map noise and 404s)
  const realErrors = errors.filter(e => !/source map|chrome-extension|404|Failed to load resource/i.test(e));
  expect(realErrors, `Console errors:\n${realErrors.join('\n')}`).toHaveLength(0);
});