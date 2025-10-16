import { test, expect } from '@playwright/test';

/**
 * Document Workflow Tests
 * Tests document upload, processing, and approval workflows
 */
test.describe('Document Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as BF staff user
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'staff@borealfinancial.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="staff-portal"]')).toBeVisible();
  });

  test('should display documents tab and document list', async ({ page }) => {
    await page.click('[data-testid="nav-documents"]');
    
    await expect(page.locator('[data-testid="documents-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="document-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-document-button"]')).toBeVisible();
  });

  test('should show document approval interface', async ({ page }) => {
    await page.click('[data-testid="nav-documents"]');
    
    // Click on first document if available
    const firstDocument = page.locator('[data-testid="document-item"]').first();
    if (await firstDocument.count() > 0) {
      await firstDocument.click();
      
      await expect(page.locator('[data-testid="document-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="approve-document-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="reject-document-button"]')).toBeVisible();
    }
  });

  test('should handle document upload', async ({ page }) => {
    await page.click('[data-testid="nav-documents"]');
    await page.click('[data-testid="upload-document-button"]');
    
    await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-upload-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="document-type-select"]')).toBeVisible();
  });

  test('should approve document', async ({ page }) => {
    await page.click('[data-testid="nav-documents"]');
    
    const firstDocument = page.locator('[data-testid="document-item"]').first();
    if (await firstDocument.count() > 0) {
      await firstDocument.click();
      await page.click('[data-testid="approve-document-button"]');
      
      // Should show approval confirmation
      await expect(page.locator('[data-testid="approval-success"]')).toBeVisible();
    }
  });

  test('should reject document with reason', async ({ page }) => {
    await page.click('[data-testid="nav-documents"]');
    
    const firstDocument = page.locator('[data-testid="document-item"]').first();
    if (await firstDocument.count() > 0) {
      await firstDocument.click();
      await page.click('[data-testid="reject-document-button"]');
      
      // Fill rejection reason
      await expect(page.locator('[data-testid="rejection-modal"]')).toBeVisible();
      await page.fill('[data-testid="rejection-reason-input"]', 'Document quality is poor');
      await page.click('[data-testid="confirm-rejection-button"]');
      
      // Should show rejection confirmation
      await expect(page.locator('[data-testid="rejection-success"]')).toBeVisible();
    }
  });

  test('should filter documents by type', async ({ page }) => {
    await page.click('[data-testid="nav-documents"]');
    
    // Use document type filter
    await page.click('[data-testid="document-type-filter"]');
    await page.click('[data-testid="filter-financial-statements"]');
    
    // Should show only financial statements
    const visibleDocs = page.locator('[data-testid="document-item"]');
    if (await visibleDocs.count() > 0) {
      await expect(visibleDocs.first()).toContainText('Financial Statement');
    }
  });

  test('should filter documents by status', async ({ page }) => {
    await page.click('[data-testid="nav-documents"]');
    
    // Use status filter
    await page.click('[data-testid="document-status-filter"]');
    await page.click('[data-testid="filter-pending"]');
    
    // Should show only pending documents
    const visibleDocs = page.locator('[data-testid="document-item"]');
    if (await visibleDocs.count() > 0) {
      await expect(visibleDocs.first()).toContainText('Pending');
    }
  });

  test('should display document analytics', async ({ page }) => {
    await page.click('[data-testid="nav-documents"]');
    
    await expect(page.locator('[data-testid="document-analytics"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-documents-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-approvals-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="approved-documents-count"]')).toBeVisible();
  });
});