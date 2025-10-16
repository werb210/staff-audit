import { test, expect } from '@playwright/test';
import { login, openTab } from './helpers';

const STAGES = ['New','In Review','Requires Documents','Off to Lender','Accepted','Denied'];

test('Pipeline board renders and a card opens details drawer', async ({ page }) => {
  await login(page);
  await openTab(page, 'Sales Pipeline');
  for (const col of STAGES) {
    await expect(page.getByRole('heading', { name: col })).toBeVisible();
  }
  // Assert mock markers never appear
  await expect(page.getByText(/Mock Co/i)).toHaveCount(0);
  await expect(page.getByText(/mock/i)).toHaveCount(0);
  
  // Click first visible card (if any)
  const card = page.locator('.card', { hasText: /\$/ }).first();
  if (await card.count()) {
    await card.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // Tabs inside drawer
    for (const t of ['Application','Banking Analysis','Financial Data','Documents','Lenders']) {
      await page.getByRole('tab', { name: t }).click();
      await expect(page.getByRole('tab', { name: t })).toHaveAttribute('aria-selected', 'true');
    }
  } else {
    test.skip(true, 'No pipeline cards present to open');
  }
});