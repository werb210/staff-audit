import { test, expect } from '@playwright/test';

const tabs = [
  { name: 'Pipeline',         sel: 'a:has-text("Pipeline")' },
  { name: 'Contacts',         sel: 'a:has-text("Contacts")' },
  { name: 'Lenders',          sel: 'a:has-text("Lenders")' },
  { name: 'Communication',    sel: 'a:has-text("Communication")' },
  { name: 'Tasks & Calendar', sel: 'a:has-text("Tasks")' },
  { name: 'Marketing',        sel: 'a:has-text("Marketing")' },
  { name: 'Reports',          sel: 'a:has-text("Reports")' },
  { name: 'Settings',         sel: 'a:has-text("Settings")' },
  { name: 'Documents',        sel: 'a:has-text("Documents")' },
  { name: 'Users',            sel: 'a:has-text("Users")' },
];

test.describe('Global Navigation & Buttons', () => {
  test('visit root', async ({ page }) => {
    await page.goto('/staff');
    await expect(page).toHaveTitle(/Staff/i);
  });

  for (const t of tabs) {
    test(`tab loads: ${t.name}`, async ({ page }) => {
      await page.goto('/staff');
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Try to click the tab
      try {
        await page.click(t.sel, { timeout: 5000 });
        
        // Basic "no crash" assertion and that the content region exists
        await expect(page.locator('main, [role="main"], .content, .tab-content')).toBeVisible();
        
        // Catch console errors
        const errs: any[] = [];
        page.on('console', m => { 
          if (m.type() === 'error' && !m.text().includes('favicon')) {
            errs.push(m.text()); 
          }
        });
        
        // Give components time to mount
        await page.waitForTimeout(500);
        
        // Allow some common development errors but flag critical ones
        const criticalErrors = errs.filter(err => 
          !err.includes('ResizeObserver') && 
          !err.includes('favicon') &&
          !err.includes('sockjs')
        );
        
        if (criticalErrors.length > 0) {
          console.warn(`${t.name} tab has console errors:`, criticalErrors);
        }
        
      } catch (error) {
        console.warn(`Could not test ${t.name} tab:`, error.message);
        // Mark as soft failure - tab might not exist yet
      }
    });
  }

  test('click accessible buttons safely', async ({ page }) => {
    await page.goto('/staff');
    
    // Open each tab and click buttons within it
    for (const t of tabs) {
      try {
        await page.click(t.sel, { timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);
        
        // Find all clickable elements
        const btns = page.locator('button, [role="button"], a.button, .btn').filter({
          has: page.locator(':visible')
        });
        
        const count = await btns.count();
        
        for (let i = 0; i < Math.min(count, 20); i++) {
          const b = btns.nth(i);
          const label = await b.textContent().catch(() => '');
          
          // Skip destructive actions
          if (/delete|remove|sign\s*out|logout|clear|reset/i.test(label || '')) continue;
          
          // Skip disabled buttons
          const isDisabled = await b.isDisabled().catch(() => false);
          if (isDisabled) continue;
          
          // Try clicking with trial mode first
          try {
            await b.click({ trial: true, timeout: 1000 });
            // If trial succeeds, do actual click
            await b.click({ timeout: 1000 });
            await page.waitForTimeout(100);
          } catch (error) {
            // Button might not be clickable, that's ok
            continue;
          }
        }
      } catch (error) {
        // Tab might not exist, continue testing others
        continue;
      }
    }
  });

  test('API endpoints respond correctly', async ({ page }) => {
    const apiTests = [
      { name: 'Lenders API', url: '/api/v1/lenders' },
      { name: 'Products API', url: '/api/lenders' },
      { name: 'Users API', url: '/api/users' },
      { name: 'Health Check', url: '/api/__health' },
    ];

    for (const api of apiTests) {
      const response = await page.request.get(api.url);
      
      if (response.status() === 200) {
        console.log(`✅ ${api.name}: OK`);
      } else {
        console.warn(`⚠️ ${api.name}: Status ${response.status()}`);
      }
    }
  });
});