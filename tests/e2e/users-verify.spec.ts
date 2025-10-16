import { test, expect } from '@playwright/test';

test('users page shows mobile_e164 and verify controls', async ({ page }) => {
  await page.route('**/api/auth/user', route => route.fulfill({
    status: 200,
    body: JSON.stringify({ ok:true, user:{ id:'u1', roles:['admin'] } }),
    headers: { 'content-type':'application/json' }
  }));

  await page.goto('/staff/settings');
  // open Users sub-tab if you have tabs inside Settings
  await page.getByRole('button', { name: /Users/i }).click().catch(() => {});

  await expect(page.locator('[data-field="mobile_e164"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Send code|Start verify/i })).toBeVisible();
});