import { test, expect } from '@playwright/test';

test('contacts drawer + carrier chip', async ({ page }) => {
  await page.goto('/staff/contacts');
  await page.waitForSelector('[data-testid="card-grid"]');
  await page.locator('[data-testid="card-grid"] .card').first().click();
  await expect(page.locator('[data-testid="carrier-chip"]')).toBeVisible({ timeout: 10000 });
});

test('users verify staged UI shows controls', async ({ page }) => {
  await page.goto('/staff/settings');
  await page.click('text=Users');
  await expect(page.getByTestId('verify-start')).toBeVisible();
});