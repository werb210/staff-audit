import { test, expect } from "@playwright/test";

test("cards open drawers and render fields", async ({ page }) => {
  // Test Contacts
  await page.goto("/portal/contacts");
  await page.waitForSelector('[data-testid="entity-grid"]', { timeout: 10000 });
  
  const contactsCard = page.locator('[data-testid="contacts-card"]').first();
  if (await contactsCard.isVisible()) {
    await contactsCard.click();
    await expect(page.locator('[data-testid="entity-drawer"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="drawer-save"]')).toBeVisible();
    await expect(page.locator('[data-testid="drawer-delete"]')).toBeVisible();
    
    // Close drawer
    await page.locator('text=Close').click();
  }

  // Test Lenders
  await page.goto("/portal/lenders");
  await page.waitForSelector('[data-testid="entity-grid"]', { timeout: 10000 });
  
  const lendersCard = page.locator('[data-testid="lenders-card"]').first();
  if (await lendersCard.isVisible()) {
    await lendersCard.click();
    await expect(page.locator('[data-testid="entity-drawer"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-list"]')).toBeVisible();
  }
});