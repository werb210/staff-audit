import { test, expect } from '@playwright/test';
const BASE = process.env.STAFF_URL!;
test('contact actions bar + drawers', async ({ page }) => {
  await page.goto(`${BASE}/contacts/demo-contact-123`, { waitUntil:'networkidle' });
  await page.getByText('Call').click();
  await expect(page.getByTestId('call-start')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('E');
  await expect(page.getByText(/Send email/i)).toBeVisible();
  await page.keyboard.press('S');
  await expect(page.getByText(/Send SMS/i)).toBeVisible();
});
