import { test, expect } from '@playwright/test';

/**
 * BF Silo - Applications & Sales Pipeline Tests
 * Tests the main BF functionality including applications and sales pipeline
 */
test.describe('BF Silo - Applications', () => {
  test.beforeEach(async ({ page }) => {
    // Login as BF staff user
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="staff-portal"]')).toBeVisible();
  });

  test('should display BF navigation tabs', async ({ page }) => {
    // Check BF-specific navigation tabs
    await expect(page.locator('[data-testid="nav-applications"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-sales-pipeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-contacts"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-documents"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-communication"]')).toBeVisible();
    
    // Should NOT see SLF phone operations tab
    await expect(page.locator('[data-testid="nav-phone-operations"]')).not.toBeVisible();
  });

  test('should load applications list', async ({ page }) => {
    await page.click('[data-testid="nav-applications"]');
    
    await expect(page.locator('[data-testid="applications-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="application-card"]')).toHaveCount(1); // Should have test application
    
    // Check for Test Business Ltd application
    await expect(page.locator('[data-testid="application-card"]').first()).toContainText('Test Business Ltd');
  });

  test('should open application details drawer', async ({ page }) => {
    await page.click('[data-testid="nav-applications"]');
    await page.click('[data-testid="application-card"]');
    
    await expect(page.locator('[data-testid="application-drawer"]')).toBeVisible();
    await expect(page.locator('[data-testid="application-title"]')).toContainText('Test Business Ltd');
    await expect(page.locator('[data-testid="application-stage"]')).toBeVisible();
    await expect(page.locator('[data-testid="application-amount"]')).toBeVisible();
  });

  test('should display sales pipeline with stages', async ({ page }) => {
    await page.click('[data-testid="nav-sales-pipeline"]');
    
    await expect(page.locator('[data-testid="sales-pipeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="stage-new"]')).toBeVisible();
    await expect(page.locator('[data-testid="stage-in-review"]')).toBeVisible();
    await expect(page.locator('[data-testid="stage-approved"]')).toBeVisible();
    await expect(page.locator('[data-testid="stage-rejected"]')).toBeVisible();
    await expect(page.locator('[data-testid="stage-funded"]')).toBeVisible();
  });

  test('should move application between pipeline stages', async ({ page }) => {
    await page.click('[data-testid="nav-sales-pipeline"]');
    
    // Find application in current stage
    const applicationCard = page.locator('[data-testid="pipeline-card"]').first();
    await expect(applicationCard).toBeVisible();
    
    // Open context menu or drag to different stage
    await applicationCard.click({ button: 'right' });
    await expect(page.locator('[data-testid="stage-move-menu"]')).toBeVisible();
    
    // Move to "Approved" stage
    await page.click('[data-testid="move-to-approved"]');
    
    // Verify application moved
    await expect(page.locator('[data-testid="stage-approved"] [data-testid="pipeline-card"]')).toHaveCount(1);
  });

  test('should download application documents as ZIP', async ({ page }) => {
    await page.click('[data-testid="nav-applications"]');
    await page.click('[data-testid="application-card"]');
    
    // Wait for drawer to open
    await expect(page.locator('[data-testid="application-drawer"]')).toBeVisible();
    
    // Setup download promise before clicking
    const downloadPromise = page.waitForEvent('download');
    
    // Click download button
    await page.click('[data-testid="download-documents-button"]');
    
    // Wait for download to complete
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
  });
});