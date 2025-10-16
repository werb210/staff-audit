import { test as base } from '@playwright/test';

/**
 * Authentication Fixtures
 * Provides authenticated users for different silos
 */
export const test = base.extend<{
  bfStaffUser: void;
  slfStaffUser: void;
  adminUser: void;
}>({
  bfStaffUser: async ({ page }, use) => {
    // Login as BF staff user
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="staff-portal"]');
    
    await use();
    
    // Cleanup - logout
    await page.click('[data-testid="logout-button"]');
  },

  slfStaffUser: async ({ page }, use) => {
    // Login as SLF staff user
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'slf@sitelevelfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="staff-portal"]');
    
    await use();
    
    // Cleanup - logout
    await page.click('[data-testid="logout-button"]');
  },

  adminUser: async ({ page }, use) => {
    // Login as admin user
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'admin@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="staff-portal"]');
    
    await use();
    
    // Cleanup - logout
    await page.click('[data-testid="logout-button"]');
  },
});

export { expect } from '@playwright/test';