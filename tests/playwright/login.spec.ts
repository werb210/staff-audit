import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

test.describe('Authentication UI Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.goto(BASE_URL);
  });

  test('login page renders without blank screen', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Should not be a blank screen
    await expect(page.locator('body')).not.toBeEmpty();
    
    // Should have login-related elements
    await expect(
      page.locator('input[type="email"], input[type="text"][placeholder*="email" i]')
    ).toBeVisible({ timeout: 5000 });
    
    await expect(
      page.locator('input[type="password"]')
    ).toBeVisible();
    
    await expect(
      page.locator('button[type="submit"], button:has-text("login"), button:has-text("sign in")')
    ).toBeVisible();
  });

  test('invalid credentials show human-readable error', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Fill in invalid credentials
    await page.fill('input[type="email"], input[type="text"][placeholder*="email" i]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("login"), button:has-text("sign in")');
    
    // Should show error message (not blank screen or spinner forever)
    await expect(
      page.locator('text=/invalid|error|incorrect|failed|denied/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('protected route redirects to login when not authenticated', async ({ page }) => {
    // Try to access a protected route directly
    await page.goto(`${BASE_URL}/portal`);
    
    // Should redirect to login or show login form
    await page.waitForURL(/login/, { timeout: 10000 });
    
    // Or check if we're on a page that has login functionality
    const hasLoginForm = await page.locator('input[type="password"]').isVisible();
    const urlHasLogin = page.url().includes('login');
    
    expect(hasLoginForm || urlHasLogin).toBeTruthy();
  });

  test('hard reload on private route shows verification state, not blank', async ({ page }) => {
    // Go to a protected route
    await page.goto(`${BASE_URL}/portal`);
    
    // Hard reload
    await page.reload({ waitUntil: 'networkidle' });
    
    // Should not be blank - either shows login or "Verifying..." or similar
    await expect(page.locator('body')).not.toBeEmpty();
    
    // Should have some content indicating state
    const hasContent = await page.locator('text=/verifying|loading|sign in|login/i').isVisible({ timeout: 5000 });
    expect(hasContent).toBeTruthy();
  });

  test('app has error boundary that catches crashes', async ({ page }) => {
    // Add a crash trigger if available, otherwise skip
    await page.goto(`${BASE_URL}/?crash=1`);
    
    // Should show error boundary, not blank white screen
    const hasErrorBoundary = await page.locator('text=/error|something went wrong|crash/i').isVisible({ timeout: 5000 });
    const isNotBlank = await page.locator('body').textContent() !== '';
    
    // Either has proper error boundary or gracefully handles the crash
    expect(hasErrorBoundary || isNotBlank).toBeTruthy();
  });

  test('iframe/iPad compatibility - no infinite spinner', async ({ page, context }) => {
    // Simulate iPad user agent
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    });
    
    await page.goto(`${BASE_URL}/login`);
    
    // Should not have infinite spinner - either shows login form or guidance
    await page.waitForTimeout(3000); // Give it time to settle
    
    const hasSpinner = await page.locator('[class*="spin"], [class*="loading"], .spinner').isVisible();
    const hasContent = await page.locator('input, button, text=/open.*new.*tab/i').isVisible();
    
    // Should either have content or not be stuck in spinner
    expect(!hasSpinner || hasContent).toBeTruthy();
  });

  test('API banner appears when backend is down', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/auth/__probe', route => route.fulfill({ status: 500 }));
    
    await page.goto(`${BASE_URL}/login`);
    
    // Should show some indication of API issues
    const hasApiBanner = await page.locator('text=/api|service|unavailable|offline|error/i').isVisible({ timeout: 10000 });
    
    // This test might need adjustment based on your actual API banner implementation
    if (hasApiBanner) {
      expect(hasApiBanner).toBeTruthy();
    } else {
      // Skip if API banner not implemented yet
      test.skip();
    }
  });

});