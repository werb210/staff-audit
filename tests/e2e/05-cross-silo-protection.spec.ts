import { test, expect } from '@playwright/test';

/**
 * Cross-Silo Protection Tests
 * Verifies strict isolation between BF and SLF silos
 */
test.describe('Cross-Silo Protection', () => {
  
  test('BF users cannot access SLF features via URL manipulation', async ({ page }) => {
    // Login as BF user
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Try to access SLF URLs directly
    await page.goto('/portal/slf/contacts');
    
    // Should be redirected or show access denied
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    await expect(page.locator('text=SLF silo access denied')).toBeVisible();
  });

  test('SLF users cannot access BF features via URL manipulation', async ({ page }) => {
    // Login as SLF user
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'slf@sitelevelfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Try to access BF URLs directly
    await page.goto('/portal/applications');
    
    // Should be redirected or show access denied
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    await expect(page.locator('text=BF silo access denied')).toBeVisible();
  });

  test('API calls respect silo boundaries', async ({ page, request }) => {
    // Login as BF user to get token
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Extract token from browser storage
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    
    // Try to access SLF API with BF token
    const response = await request.get('/api/slf/contacts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('SLF silo access denied');
  });

  test('Data isolation - BF cannot see SLF contacts', async ({ page }) => {
    // Login as BF user
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to BF contacts (different from SLF contacts)
    await page.click('[data-testid="nav-contacts"]');
    
    // Should see BF CRM contacts, not SLF phone contacts
    await expect(page.locator('[data-testid="bf-crm-contacts"]')).toBeVisible();
    await expect(page.locator('[data-testid="slf-phone-contacts"]')).not.toBeVisible();
  });

  test('Phone number enforcement per silo', async ({ page }) => {
    // Test BF phone number
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await page.click('[data-testid="nav-communication"]');
    await expect(page.locator('[data-testid="bf-phone-number"]')).toContainText('(825) 451-1768');
    
    await page.click('[data-testid="logout-button"]');
    
    // Test SLF phone number
    await page.fill('[data-testid="email-input"]', 'slf@sitelevelfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await page.click('[data-testid="nav-phone-operations"]');
    await expect(page.locator('[data-testid="slf-phone-number"]')).toContainText('(775) 314-6801');
  });

  test('Navigation menus respect silo restrictions', async ({ page }) => {
    // BF user navigation
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // BF should have full navigation
    const bfNavItems = ['applications', 'sales-pipeline', 'contacts', 'documents', 'communication'];
    for (const item of bfNavItems) {
      await expect(page.locator(`[data-testid="nav-${item}"]`)).toBeVisible();
    }
    
    // Should not have SLF-specific nav
    await expect(page.locator('[data-testid="nav-phone-operations"]')).not.toBeVisible();
    
    await page.click('[data-testid="logout-button"]');
    
    // SLF user navigation
    await page.fill('[data-testid="email-input"]', 'slf@sitelevelfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // SLF should only have phone operations
    await expect(page.locator('[data-testid="nav-phone-operations"]')).toBeVisible();
    
    // Should not have BF-specific nav
    for (const item of bfNavItems) {
      await expect(page.locator(`[data-testid="nav-${item}"]`)).not.toBeVisible();
    }
  });
});