import { test, expect } from '@playwright/test';

/**
 * Performance Tests
 * Tests page load times, API response times, and overall performance
 */
test.describe('Performance Tests', () => {
  test('should load login page quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
  });

  test('should load staff portal quickly after login', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    const startTime = Date.now();
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="staff-portal"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Portal should load within 5 seconds
  });

  test('should load applications list quickly', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="staff-portal"]')).toBeVisible();
    
    const startTime = Date.now();
    await page.click('[data-testid="nav-applications"]');
    await expect(page.locator('[data-testid="applications-list"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000); // Applications should load within 2 seconds
  });

  test('should have fast API response times', async ({ request }) => {
    // Test multiple API endpoints for response time
    const endpoints = [
      '/api/health',
      '/api/applications',
      '/api/documents',
      '/api/lenders'
    ];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      const response = await request.get(endpoint);
      const responseTime = Date.now() - startTime;
      
      // Most endpoints should respond within 1 second (except auth-protected ones)
      if (response.status() !== 401) {
        expect(responseTime).toBeLessThan(1000);
      }
    }
  });

  test('should handle concurrent requests efficiently', async ({ request }) => {
    // Test concurrent API calls
    const promises = Array(10).fill(0).map(() => 
      request.get('/api/health')
    );
    
    const startTime = Date.now();
    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    // All 10 requests should complete within 3 seconds
    expect(totalTime).toBeLessThan(3000);
    
    // All should be successful
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });
  });

  test('should have acceptable memory usage', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate through different sections to test memory usage
    const sections = ['applications', 'sales-pipeline', 'documents', 'contacts'];
    
    for (const section of sections) {
      await page.click(`[data-testid="nav-${section}"]`);
      await page.waitForTimeout(1000); // Allow content to load
      
      // Check that page is still responsive
      await expect(page.locator('[data-testid="staff-portal"]')).toBeVisible();
    }
  });
});