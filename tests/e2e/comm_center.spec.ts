import { test, expect } from '@playwright/test';
const BASE = process.env.STAFF_URL!;

test('Communication Center tabs render', async ({ page }) => {
  await page.goto(`${BASE}/comm`, { waitUntil:'networkidle' });
  await expect(page.getByText('Communication Center')).toBeVisible();
  await expect(page.getByText('SMS')).toBeVisible();
  
  await page.getByRole('link', { name: 'Calls' }).click();
  await expect(page.getByTestId('call-start')).toBeVisible();
  
  await page.getByRole('link', { name: 'Email' }).click();
  await expect(page.getByPlaceholder('Subject + body')).toBeVisible();
  
  await page.getByRole('link', { name: 'Templates' }).click();
  await expect(page.getByText('ALL')).toBeVisible();
});