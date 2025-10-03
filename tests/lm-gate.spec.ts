import { test, expect } from '@playwright/test';

const pages = ['/login', '/otp', '/portal', '/portal/dashboard', '/portal/pipeline', '/portal/contacts'];

for (const path of pages) {
  test(`LM style present: ${path}`, async ({ page }) => {
    await page.goto(path);
    
    // LM wrapper exists
    await expect(page.locator('.lm-page')).toBeVisible();
    
    // Page background is gradient-like (LM look)
    const bg = await page.evaluate(() => 
      getComputedStyle(document.querySelector('.lm-page')!).backgroundImage
    );
    expect(bg).toContain('gradient');
    
    // Check that we're using LM design system
    const lmApp = page.locator('.lm-app');
    await expect(lmApp).toBeVisible();
    
    // Verify no excessive inline styles on main components
    const inlineStyles = await page.evaluate(() => {
      const elementsWithStyle = document.querySelectorAll('[style]');
      return Array.from(elementsWithStyle).filter(el => 
        el.getAttribute('style')?.includes('background:') || 
        el.getAttribute('style')?.includes('color:') ||
        el.getAttribute('style')?.includes('padding:')
      ).length;
    });
    
    // Allow some inline styles but not excessive usage
    expect(inlineStyles).toBeLessThan(5);
  });
}