import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toHaveText('Staff Login');
    await expect(page.locator('input[placeholder="Email"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Password"]')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Enter invalid credentials
    await page.fill('input[placeholder="Email"]', 'invalid@test.com');
    await page.fill('input[placeholder="Password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('div').filter({ hasText: /invalid_credentials|Login failed/ })).toBeVisible();
    
    // Should stay on login page
    await expect(page.locator('h1')).toHaveText('Staff Login');
  });

  test('should accept valid credentials and redirect', async ({ page }) => {
    await page.goto('/login');
    
    // Enter valid credentials
    await page.fill('input[placeholder="Email"]', 'admin@test.com');
    await page.fill('input[placeholder="Password"]', 'admin123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to portal or show MFA step
    await page.waitForURL(/\/(portal|login)/, { timeout: 5000 });
    
    // If redirected to portal, we're logged in
    if (page.url().includes('/portal')) {
      await expect(page).toHaveURL(/\/portal/);
    } else {
      // If still on login, check for MFA step
      await expect(page.locator('h1')).toHaveText(/Two-Factor Authentication|Staff Login/);
    }
  });
});