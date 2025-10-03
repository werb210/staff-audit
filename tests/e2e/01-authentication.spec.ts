import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests
 * Tests login, logout, and session management
 */
test.describe('Authentication System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form for unauthenticated users', async ({ page }) => {
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Submit login
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to staff portal
    await expect(page).toHaveURL(/.*\/portal/);
    await expect(page.locator('[data-testid="staff-portal"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });

  test('should logout and redirect to login', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for portal to load
    await expect(page.locator('[data-testid="staff-portal"]')).toBeVisible();
    
    // Logout
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should maintain session on page refresh', async ({ page }) => {
    // Login
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="staff-portal"]')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page.locator('[data-testid="staff-portal"]')).toBeVisible();
  });
});