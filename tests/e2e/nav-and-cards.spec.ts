import { test, expect } from '@playwright/test';
import { assertOnlyApprovedNamespaces } from './utils/allowedNamespaces';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // ensure token header gets sent if your app reads localStorage.token
    localStorage.setItem('token', localStorage.getItem('token') || 'dev-token');
  });
});

test('lenders: cards render, drawer opens, edit + delete buttons exist', async ({ page }) => {
  await page.goto('/staff/lenders');
  await assertOnlyApprovedNamespaces(page);

  const grid = page.locator('[data-testid="card-grid"]');
  await expect(grid).toBeVisible();

  const first = grid.locator('[data-test-card]').first();
  await first.click();

  const drawer = page.locator('[data-testid="entity-drawer"]');
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('[data-test="btn-save"]')).toBeVisible();
  await expect(drawer.locator('[data-test="btn-delete"]')).toBeVisible();
});

test('contacts: hubspot-style 3-pane and card list', async ({ page }) => {
  await page.goto('/staff/contacts');
  await assertOnlyApprovedNamespaces(page);

  await expect(page.locator('[data-testid="contact-list"]')).toBeVisible();
  await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
  await expect(page.locator('[data-testid="contact-sidebar"]')).toBeVisible();
});