import { test, expect } from '@playwright/test';

test.describe('Logout Flow', () => {
  test('should logout and redirect to login', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[placeholder="Email"]', 'admin@test.com');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for potential redirect (might be MFA or direct to portal)
    await page.waitForTimeout(2000);
    
    // If we're on MFA page, skip it for this test
    if (page.url().includes('/login')) {
      const mfaHeading = await page.locator('h1').textContent();
      if (mfaHeading?.includes('Two-Factor')) {
        // Skip MFA testing for logout test
        test.skip('MFA enabled, skipping logout test');
      }
    }
    
    // Assuming we're logged in and on portal page
    // Look for logout button or menu
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out"), a:has-text("Logout"), a:has-text("Log out")').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('h1')).toHaveText('Staff Login');
    } else {
      // Alternative: directly call logout API
      const response = await page.request.post('/api/auth/logout', {
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.ok()).toBeTruthy();
      
      // Navigate to protected route - should redirect to login
      await page.goto('/portal');
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should clear session cookie on logout', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[placeholder="Email"]', 'admin@test.com');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForTimeout(2000);
    
    // Call logout API directly
    const response = await page.request.post('/api/auth/logout');
    expect(response.ok()).toBeTruthy();
    
    // Check that session is cleared by calling /api/auth/user
    const userResponse = await page.request.get('/api/auth/user');
    const userData = await userResponse.json();
    
    expect(userData.authenticated).toBeFalsy();
  });
});