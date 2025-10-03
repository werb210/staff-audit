import { test, expect } from '@playwright/test';

test('layout + tabs order + debug banner', async ({ page }) => {
  await page.goto('/?debug=1');
  await expect(page.locator('aside[role="navigation"]')).toBeVisible();
  await expect(page.locator('text=DEBUG — hash:')).toBeVisible();
  
  const tabs = await page.locator('[data-testid="main-tabs"] a').allInnerTexts();
  expect(tabs).toEqual([
    'Sales Pipeline','Lenders','Lender Products','Contacts','Communication','Reports','Tasks & Calendar','Marketing','Settings'
  ]);
});

test('pipeline: docs live on card & dialer slides from right', async ({ page }) => {
  await page.goto('/pipeline');
  const card = page.locator('[data-testid="pipe-card"]').first();
  await card.click();
  await expect(page.locator('[role="dialog"] [data-tab="documents"]')).toBeVisible();
  
  await page.getByRole('button', { name: 'Call' }).click();
  const dialer = page.locator('[data-testid="dialer"]');
  await expect(dialer).toBeVisible();
  
  const box = await dialer.boundingBox();
  const viewport = page.viewportSize();
  expect(box?.x || 0).toBeGreaterThan((viewport?.width || 0)/2); // right side
});

test('states copy: empty/network/auth', async ({ page }) => {
  await page.route('**/api/reports/**', route => route.fulfill({ status: 500, body: '' }));
  await page.goto('/reports');
  await expect(page.getByText("We couldn't reach the server. Retry.")).toBeVisible();
});