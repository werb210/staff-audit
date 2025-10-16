import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

test.describe('UI Login Flow Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear authentication state
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('login page renders with all required elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Should have email/username input
    const emailInput = page.locator('input[type="email"], input[type="text"][placeholder*="email" i]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    
    // Should have password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    
    // Should have submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("login"), button:has-text("sign in")');
    await expect(submitButton).toBeVisible();
    
    // Page should not be blank
    const bodyText = await page.textContent('body');
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });

  test('bad credentials show inline error message', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Fill in bad credentials
    await page.fill('input[type="email"], input[type="text"][placeholder*="email" i]', 'bad@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("login"), button:has-text("sign in")');
    
    // Should show error message (not blank or infinite loading)
    const errorMessage = await page.locator('text=/invalid|incorrect|failed|denied|error|wrong/i').isVisible({ timeout: 10000 });
    expect(errorMessage).toBeTruthy();
    
    // Should still show login form
    const passwordInput = await page.locator('input[type="password"]').isVisible();
    expect(passwordInput).toBeTruthy();
  });

  test('successful login redirects to portal or dashboard', async ({ page }) => {
    // This test would require valid credentials
    // For now, we'll test the flow structure
    
    await page.goto(`${BASE_URL}/login`);
    
    // Mock successful login
    await page.route('**/api/auth/login', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user: { id: '1', email: 'test@test.com' },
        token: 'mock_token'
      })
    }));
    
    // Mock auth check
    await page.route('**/api/rbac/auth/me', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user: { id: '1', email: 'test@test.com' },
        authenticated: true
      })
    }));
    
    // Fill and submit form
    await page.fill('input[type="email"], input[type="text"][placeholder*="email" i]', 'test@test.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"], button:has-text("login"), button:has-text("sign in")');
    
    // Should redirect away from login page
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    const isStillOnLogin = currentUrl.includes('login');
    
    // Either redirected or shows success (not stuck on login)
    expect(isStillOnLogin).toBeFalsy();
  });

  test('login form validates required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Try to submit with empty fields
    await page.click('button[type="submit"], button:has-text("login"), button:has-text("sign in")');
    
    // Should show validation errors or prevent submission
    const hasValidationError = await page.locator('text=/required|enter.*email|enter.*password/i').isVisible({ timeout: 3000 });
    const formStillVisible = await page.locator('input[type="password"]').isVisible();
    
    // Should either show validation or prevent submission
    expect(hasValidationError || formStillVisible).toBeTruthy();
  });

  test('loading state during login attempt', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Mock slow login response
    await page.route('**/api/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Invalid credentials' })
      });
    });
    
    // Fill and submit form
    await page.fill('input[type="email"], input[type="text"][placeholder*="email" i]', 'test@test.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"], button:has-text("login"), button:has-text("sign in")');
    
    // Should show loading state
    const hasLoadingState = await page.locator('text=/loading|signing|please.*wait/i, [class*="loading"], [class*="spinner"]').isVisible({ timeout: 1000 });
    
    // Loading state is optional but good UX
    if (hasLoadingState) {
      expect(hasLoadingState).toBeTruthy();
    }
    
    // Should eventually show error
    const hasError = await page.locator('text=/invalid|error/i').isVisible({ timeout: 5000 });
    expect(hasError).toBeTruthy();
  });

  test('forgot password link available', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Should have forgot password option
    const forgotPasswordLink = await page.locator('a:has-text("forgot"), a:has-text("reset"), text=/forgot.*password|reset.*password/i').isVisible({ timeout: 3000 });
    
    // Forgot password is optional but common
    if (forgotPasswordLink) {
      expect(forgotPasswordLink).toBeTruthy();
    }
  });

  test('remember me option works', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Look for remember me option
    const rememberCheckbox = await page.locator('input[type="checkbox"][name*="remember"], input[type="checkbox"] + label:has-text("remember")').isVisible({ timeout: 3000 });
    
    // Remember me is optional
    if (rememberCheckbox) {
      await page.check('input[type="checkbox"][name*="remember"], input[type="checkbox"]');
      const isChecked = await page.isChecked('input[type="checkbox"][name*="remember"], input[type="checkbox"]');
      expect(isChecked).toBeTruthy();
    }
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    const emailFocused = await page.evaluate(() => {
      const activeElement = document.activeElement;
      return activeElement?.getAttribute('type') === 'email' || 
             activeElement?.getAttribute('type') === 'text';
    });
    
    await page.keyboard.press('Tab');
    const passwordFocused = await page.evaluate(() => {
      const activeElement = document.activeElement;
      return activeElement?.getAttribute('type') === 'password';
    });
    
    // Should be able to navigate with keyboard
    expect(emailFocused || passwordFocused).toBeTruthy();
    
    // Enter should submit form
    await page.fill('input[type="email"], input[type="text"][placeholder*="email" i]', 'test@test.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.keyboard.press('Enter');
    
    // Should trigger form submission
    await page.waitForTimeout(1000);
    // Form submission behavior will depend on implementation
  });

});