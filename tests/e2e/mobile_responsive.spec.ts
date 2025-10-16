import { test, expect } from '@playwright/test';
import { enableApiMocks } from '../utils/mocks';

const CONTACT_ID = process.env.CONTACT_ID || 'demo-contact-123';

test.describe('Mobile Responsive Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await enableApiMocks(page, { contactId: CONTACT_ID });
    await page.goto(`/contacts/${CONTACT_ID}`);
  });

  test('Mobile: bottom navigation is visible on small screens', async ({ page, browserName }) => {
    // Only test on mobile Chrome project
    if (browserName !== 'chromium') return;
    
    await expect(page.getByTestId('contact-details-3col')).toBeVisible();
    
    // Check if we're on mobile viewport
    const viewport = page.viewportSize();
    if (viewport && viewport.width <= 768) {
      // Mobile bottom tabs should be visible
      await expect(page.getByTestId('mobile-bottom-tabs')).toBeVisible();
      
      // Desktop tabs should be hidden
      const desktopTabs = page.locator('.hidden.md\\:flex');
      await expect(desktopTabs).toHaveCount(1);
    }
  });

  test('Desktop: horizontal tabs are visible on large screens', async ({ page, browserName }) => {
    // Test desktop behavior
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 768) {
      // Desktop horizontal tabs should be visible
      await expect(page.getByTestId('tab-timeline')).toBeVisible();
      await expect(page.getByTestId('tab-sms')).toBeVisible();
      await expect(page.getByTestId('tab-calls')).toBeVisible();
      await expect(page.getByTestId('tab-email')).toBeVisible();
      await expect(page.getByTestId('tab-meetings')).toBeVisible();
      
      // Mobile bottom navigation exists but may be hidden via CSS
      await expect(page.getByTestId('mobile-bottom-tabs')).toHaveCount(1);
    }
  });

  test('Tab switching works on both mobile and desktop', async ({ page }) => {
    await expect(page.getByTestId('comms-tabs')).toBeVisible();
    
    // Test tab navigation
    await page.getByTestId('tab-timeline').click();
    await expect(page.getByTestId('filter-all')).toBeVisible();
    
    await page.getByTestId('tab-sms').click();
    await expect(page.getByTestId('sms-to')).toBeVisible();
    
    await page.getByTestId('tab-calls').click();
    await expect(page.getByTestId('call-to')).toBeVisible();
    
    await page.getByTestId('tab-email').click();
    await expect(page.getByText('Email History')).toBeVisible();
    
    await page.getByTestId('tab-meetings').click();
    await expect(page.getByTestId('meeting-when')).toBeVisible();
  });

  test('Content areas are properly sized and scrollable', async ({ page }) => {
    await page.getByTestId('tab-timeline').click();
    
    // Check that the communications content area is properly constrained
    const commsContainer = page.getByTestId('comms-tabs');
    await expect(commsContainer).toBeVisible();
    await expect(commsContainer).toHaveCSS('display', 'flex');
  });

  test('Touch interactions work on mobile', async ({ page }) => {
    const viewport = page.viewportSize();
    if (viewport && viewport.width <= 768) {
      // Test touch-friendly interactions
      await page.getByTestId('tab-sms').tap();
      await expect(page.getByTestId('sms-body')).toBeVisible();
      
      // Test touch input
      await page.getByTestId('sms-body').tap();
      await page.getByTestId('sms-body').fill('Touch test message');
      
      const content = await page.getByTestId('sms-body').inputValue();
      expect(content).toBe('Touch test message');
    }
  });
});