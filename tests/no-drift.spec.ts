import { test, expect } from '@playwright/test';

test.describe('No-Drift UI', () => {
  test('has exactly the canonical 9 tabs and no legacy ones', async ({ page }) => {
    await page.goto('/staff?debug=1', { waitUntil: 'networkidle' });

    // Debug banner present
    const banner = page.locator('[data-debug-banner]');
    await expect(banner).toBeVisible();

    // Canonical nav
    const labels = await page.locator('[data-testid="side-nav"] a').allTextContents();
    const trimmed = labels.map(s => s.trim()).filter(Boolean);

    const expected = [
      'Sales Pipeline',
      'Lenders',
      'Lender Products',
      'Contacts',
      'Communication Hub',
      'Reports',
      'Tasks & Calendar',
      'Marketing',
      'Settings',
    ];

    expect(trimmed).toEqual(expected);

    // Must NOT see any legacy tabs
    for (const bad of ['Dashboard','Analytics','Productivity','TopTabs','TopNav']) {
      await expect(page.locator(`[data-testid="side-nav"] :text("${bad}")`)).toHaveCount(0);
    }
  });
});