import { test, expect } from '@playwright/test';

test('singleton nav + card pages render', async ({ page }) => {
  await page.goto('/staff/lenders');
  await expect(page.locator('[data-testid="side-nav"]')).toBeVisible();
  const tabs = await page.locator('[data-testid="side-nav"] [data-test-nav]').allTextContents();
  expect(tabs).toEqual([
    'Sales Pipeline','Lenders','Lender Products','Contacts','Communication Hub',
    'Tasks & Calendar','Marketing','Reports','Settings'
  ]);
  await expect(page.locator('[data-testid="card-grid"]')).toBeVisible();

  // Click first card -> drawer opens
  const firstCard = page.locator('[data-testid="card-grid"] [data-test-card]').first();
  await firstCard.click();
  await expect(page.locator('[data-testid="entity-drawer"]')).toBeVisible();

  // Contacts page has 3-pane
  await page.goto('/staff/contacts');
  await expect(page.locator('[data-testid="contact-list"]')).toBeVisible();
  await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
  await expect(page.locator('[data-testid="contact-sidebar"]')).toBeVisible();
});
