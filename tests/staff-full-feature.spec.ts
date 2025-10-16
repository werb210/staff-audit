import { test, expect } from '@playwright/test';

// Use authenticated storage state
test.use({ storageState: 'tests/.auth/user.json' });

test.describe('Staff Application Full Feature Suite', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

  test('Dashboard loads and displays key metrics', async ({ page }) => {
    await page.goto(`${baseUrl}/portal`);
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    
    // Check for key dashboard elements
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Check for navigation elements
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toBeVisible();
  });

  test('Applications page loads pipeline', async ({ page }) => {
    await page.goto(`${baseUrl}/portal`);
    
    // Navigate to applications if not already there
    await page.click('text=Applications', { timeout: 5000 }).catch(() => {});
    
    await page.waitForLoadState('networkidle');
    
    // Check for application cards or table
    const applicationElements = page.locator('[data-testid*="application"], .application-card, tr');
    await expect(applicationElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('Voice system endpoints respond correctly', async ({ page }) => {
    // Test voice inbound endpoint
    const voiceResponse = await page.request.post(`${baseUrl}/api/voice/inbound`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'From=%2B15551234567&To=%2B15551234568&CallSid=CA1234567890abcdef1234567890abcdef'
    });
    
    expect(voiceResponse.status()).toBe(200);
    const voiceText = await voiceResponse.text();
    expect(voiceText).toContain('<Response>');
    expect(voiceText).toContain('Todd');
    expect(voiceText).toContain('Andrew');
    expect(voiceText).toContain('conference');
  });

  test('Conference system endpoints respond correctly', async ({ page }) => {
    // Test conference entry endpoint
    const conferenceResponse = await page.request.post(`${baseUrl}/api/conference/enter`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'From=%2B15551234567&To=%2B15551234568&CallSid=CA1234567890abcdef1234567890abcdef'
    });
    
    expect(conferenceResponse.status()).toBe(200);
    const conferenceText = await conferenceResponse.text();
    expect(conferenceText).toContain('<Response>');
    expect(conferenceText).toContain('pin');
  });

  test('Conflicts demo endpoint returns JSON', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/conflicts/demo`, {
      headers: { 'Accept': 'application/json' }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.columns)).toBe(true);
  });

  test('Navigation and responsive design', async ({ page }) => {
    await page.goto(`${baseUrl}/portal`);
    await page.waitForLoadState('networkidle');
    
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    // Check for navigation elements
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Navigation should still be accessible (possibly through hamburger menu)
    const mobileNav = page.locator('nav, [role="navigation"], button[aria-label*="menu"]');
    await expect(mobileNav.first()).toBeVisible();
  });

  test('LisaMorgan design system usage', async ({ page }) => {
    await page.goto(`${baseUrl}/portal`);
    await page.waitForLoadState('networkidle');
    
    // Check for LisaMorgan CSS custom properties
    const styles = await page.evaluate(() => {
      const element = document.documentElement;
      const computedStyle = getComputedStyle(element);
      return {
        hasLmPrimary: computedStyle.getPropertyValue('--lm-primary').trim() !== '',
        hasLmSpacing: computedStyle.getPropertyValue('--lm-spacing-md').trim() !== ''
      };
    });
    
    // At least some LM tokens should be defined
    expect(styles.hasLmPrimary || styles.hasLmSpacing).toBe(true);
    
    // Check for LM utility classes in use
    const lmElements = page.locator('[class*="lm-"]');
    const count = await lmElements.count();
    expect(count).toBeGreaterThan(0);
  });
});