import { test, expect } from '@playwright/test';

test.describe('Iframe Authentication', () => {
  test('should detect iframe context and show open in new tab CTA', async ({ page }) => {
    // Simulate iframe context by creating a page within a frame
    await page.goto('/login');
    
    // Inject script to simulate iframe context
    await page.addInitScript(() => {
      // Mock window.top !== window.self to simulate iframe
      Object.defineProperty(window, 'top', {
        value: {},
        writable: false
      });
    });
    
    // Navigate to a protected route that should trigger RequireAuth
    await page.goto('/portal');
    
    // Should show iframe warning instead of infinite spinner
    await expect(page.locator('text=Login blocked in embedded view')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Open in New Tab")')).toBeVisible();
  });

  test('should open new tab when CTA is clicked', async ({ context, page }) => {
    // Simulate iframe context
    await page.addInitScript(() => {
      Object.defineProperty(window, 'top', {
        value: {},
        writable: false
      });
    });
    
    await page.goto('/portal');
    
    // Wait for iframe warning to appear
    await expect(page.locator('text=Login blocked in embedded view')).toBeVisible();
    
    // Listen for new page (tab) creation
    const pagePromise = context.waitForEvent('page');
    
    // Click the "Open in New Tab" button
    await page.click('button:has-text("Open in New Tab")');
    
    // Verify new page was opened
    const newPage = await pagePromise;
    await expect(newPage).toHaveURL(page.url());
  });
});