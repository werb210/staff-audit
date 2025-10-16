import { test, expect } from '@playwright/test';
const BASE = process.env.STAFF_URL!;
test('Scheduling tab renders and switches', async ({ page }) => {
  await page.goto(`${BASE}/scheduling`, { waitUntil:'networkidle' });
  await expect(page.getByText('My Tasks')).toBeVisible();
  await page.getByRole('button', { name: 'Team Tasks' }).click();
  await expect(page.getByText('Team Tasks')).toBeVisible();
  await page.getByRole('button', { name: 'Calendar' }).click();
  await expect(page.getByText('Calendar')).toBeVisible();
});