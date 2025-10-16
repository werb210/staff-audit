import { test, expect } from '@playwright/test';

/**
 * SLF Silo - Second Phone Line Features Tests
 * Tests SLF-specific functionality: contacts and dialer
 */
test.describe('SLF Silo - Phone Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login as SLF staff user (different from BF)
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'slf@sitelevelfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="staff-portal"]')).toBeVisible();
  });

  test('should display SLF-only navigation', async ({ page }) => {
    // SLF users should ONLY see Phone Operations tab
    await expect(page.locator('[data-testid="nav-phone-operations"]')).toBeVisible();
    
    // Should NOT see BF tabs
    await expect(page.locator('[data-testid="nav-applications"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-sales-pipeline"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-documents"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-communication"]')).not.toBeVisible();
  });

  test('should display SLF phone number prominently', async ({ page }) => {
    await page.click('[data-testid="nav-phone-operations"]');
    
    // SLF phone number should be displayed
    await expect(page.locator('[data-testid="slf-phone-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="slf-phone-number"]')).toContainText('(775) 314-6801');
  });

  test('should load SLF contacts list', async ({ page }) => {
    await page.click('[data-testid="nav-phone-operations"]');
    await page.click('[data-testid="slf-contacts-tab"]');
    
    await expect(page.locator('[data-testid="slf-contacts-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-slf-contact-button"]')).toBeVisible();
  });

  test('should add new SLF contact', async ({ page }) => {
    await page.click('[data-testid="nav-phone-operations"]');
    await page.click('[data-testid="slf-contacts-tab"]');
    await page.click('[data-testid="add-slf-contact-button"]');
    
    // Fill contact form
    await expect(page.locator('[data-testid="contact-form"]')).toBeVisible();
    await page.fill('[data-testid="contact-name-input"]', 'John Smith');
    await page.fill('[data-testid="contact-phone-input"]', '555-123-4567');
    await page.fill('[data-testid="contact-company-input"]', 'ABC Corp');
    
    await page.click('[data-testid="save-contact-button"]');
    
    // Verify contact was added
    await expect(page.locator('[data-testid="slf-contacts-list"]')).toContainText('John Smith');
  });

  test('should display SLF dialer interface', async ({ page }) => {
    await page.click('[data-testid="nav-phone-operations"]');
    await page.click('[data-testid="slf-dialer-tab"]');
    
    await expect(page.locator('[data-testid="slf-dialer"]')).toBeVisible();
    await expect(page.locator('[data-testid="dialer-number-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="make-call-button"]')).toBeVisible();
    
    // Verify SLF phone number is enforced
    await expect(page.locator('[data-testid="dialer-from-number"]')).toContainText('(775) 314-6801');
  });

  test('should initiate call through SLF dialer', async ({ page }) => {
    await page.click('[data-testid="nav-phone-operations"]');
    await page.click('[data-testid="slf-dialer-tab"]');
    
    // Enter phone number to call
    await page.fill('[data-testid="dialer-number-input"]', '555-987-6543');
    
    // Initiate call
    await page.click('[data-testid="make-call-button"]');
    
    // Should show call in progress
    await expect(page.locator('[data-testid="call-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="call-status"]')).toContainText('Call initiated');
  });

  test('should display SLF call history', async ({ page }) => {
    await page.click('[data-testid="nav-phone-operations"]');
    await page.click('[data-testid="slf-call-history-tab"]');
    
    await expect(page.locator('[data-testid="slf-call-history"]')).toBeVisible();
    await expect(page.locator('[data-testid="call-history-list"]')).toBeVisible();
  });

  test('should display SLF analytics', async ({ page }) => {
    await page.click('[data-testid="nav-phone-operations"]');
    await page.click('[data-testid="slf-analytics-tab"]');
    
    await expect(page.locator('[data-testid="slf-analytics"]')).toBeVisible();
    await expect(page.locator('[data-testid="contacts-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="calls-count"]')).toBeVisible();
  });
});