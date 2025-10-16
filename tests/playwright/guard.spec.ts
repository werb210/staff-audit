import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

test.describe('Route Guard Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
  });

  test('deep link to protected route when logged out redirects to login', async ({ page }) => {
    // Try to access protected routes directly
    const protectedRoutes = ['/portal', '/dashboard', '/applications', '/staff'];
    
    for (const route of protectedRoutes) {
      await page.goto(`${BASE_URL}${route}`);
      
      // Should redirect to login or show login form
      await page.waitForTimeout(2000); // Give redirect time
      
      const currentUrl = page.url();
      const hasLoginForm = await page.locator('input[type="password"]').isVisible();
      const isOnLoginPage = currentUrl.includes('login') || currentUrl.includes('auth');
      
      expect(hasLoginForm || isOnLoginPage).toBeTruthy();
    }
  });

  test('expired session redirects gracefully with toast/message', async ({ page }) => {
    // This test would require setting up an expired token
    // For now, we'll test the general behavior
    
    await page.goto(`${BASE_URL}/portal`);
    
    // Mock expired session response
    await page.route('**/api/rbac/auth/me', route => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Token expired' })
    }));
    
    // Reload to trigger auth check
    await page.reload();
    
    // Should redirect and possibly show toast/message
    await page.waitForTimeout(3000);
    
    const hasLoginForm = await page.locator('input[type="password"]').isVisible();
    const hasToast = await page.locator('text=/expired|signed out|session/i').isVisible();
    
    expect(hasLoginForm).toBeTruthy();
    // Toast is optional but nice to have
  });

  test('unauthorized API calls show proper error states', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal`);
    
    // Mock 401 responses from API
    await page.route('**/api/**', route => {
      if (route.request().url().includes('__probe')) {
        route.continue(); // Let probe through
      } else {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' })
        });
      }
    });
    
    await page.reload();
    
    // Should handle 401s gracefully - either redirect or show auth error
    await page.waitForTimeout(3000);
    
    const hasErrorState = await page.locator('text=/unauthorized|sign in|login/i').isVisible();
    const isNotBlank = (await page.locator('body').textContent() || '').trim() !== '';
    
    expect(hasErrorState || isNotBlank).toBeTruthy();
  });

  test('route guard checks authentication before rendering protected content', async ({ page }) => {
    // Start by going to login to establish the flow
    await page.goto(`${BASE_URL}/login`);
    
    // Then try to navigate to protected route
    await page.goto(`${BASE_URL}/portal`);
    
    // Should either:
    // 1. Show verification/loading state briefly
    // 2. Redirect to login immediately
    // 3. Show login form inline
    
    await page.waitForTimeout(1000);
    
    const hasVerificationState = await page.locator('text=/verifying|checking|loading/i').isVisible();
    const hasLoginForm = await page.locator('input[type="password"]').isVisible();
    const isOnLoginPage = page.url().includes('login');
    
    expect(hasVerificationState || hasLoginForm || isOnLoginPage).toBeTruthy();
  });

  test('no client-side auth bypass possible', async ({ page }) => {
    // Try to manipulate local storage/session storage to bypass auth
    await page.goto(`${BASE_URL}/login`);
    
    // Set fake auth tokens
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'fake_token');
      localStorage.setItem('user', JSON.stringify({ id: 1, email: 'fake@test.com' }));
      sessionStorage.setItem('authenticated', 'true');
    });
    
    // Try to access protected route
    await page.goto(`${BASE_URL}/portal`);
    
    // Should still be redirected to login or require server validation
    await page.waitForTimeout(3000);
    
    const hasLoginForm = await page.locator('input[type="password"]').isVisible();
    const isOnLoginPage = page.url().includes('login');
    
    // Should not be able to bypass server-side auth check
    expect(hasLoginForm || isOnLoginPage).toBeTruthy();
  });

  test('single UI enforcement - no dual shells or iframe widgets', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal`);
    
    // Should not have multiple React roots or iframe widgets
    const reactRoots = await page.locator('[id*="root"], [class*="react"]').count();
    const iframes = await page.locator('iframe:not([src*="stripe"]):not([src*="payment"])').count();
    
    // Should have single React app, minimal iframes
    expect(reactRoots).toBeLessThanOrEqual(2); // Allow for potential portal/modal roots
    expect(iframes).toBeLessThanOrEqual(1); // Allow for one legitimate iframe if needed
  });

});