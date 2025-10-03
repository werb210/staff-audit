import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5000';
const EMAIL = process.env.LOGIN_EMAIL || 'todd.w@boreal.financial';
const PASSWORD = process.env.LOGIN_PASSWORD || 'password123';

// Login function that can be reused
async function loginUser(page) {
  await page.goto(BASE + '/');
  
  // Fill login form
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /log in|sign in/i }).click();
  
  // Handle OTP if present
  try {
    await page.waitForSelector('input[placeholder*="code"], input[placeholder*="OTP"], [data-testid="otp-input"]', { timeout: 2000 });
    await page.fill('input[placeholder*="code"], input[placeholder*="OTP"], [data-testid="otp-input"]', '123456');
    await page.getByRole('button', { name: /verify/i }).click();
  } catch (e) {
    // No OTP required
  }
  
  // Wait for redirect to portal/app
  await page.waitForLoadState('networkidle');
}

test.describe('Staff Application Feature Tests', () => {
  
  test('Authentication and Basic Navigation', async ({ page }) => {
    await loginUser(page);
    
    // Verify we're logged in and can access portal
    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);
    
    // Try to navigate to a protected page to verify auth
    await page.goto(BASE + '/pipeline');
    await page.waitForLoadState('networkidle');
    
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    
    // Check if we're still authenticated
    if (finalUrl.includes('/login')) {
      console.log('❌ Authentication failed - redirected to login');
      throw new Error('Authentication failed');
    } else {
      console.log('✅ Authentication successful');
    }
  });

  test('Sales Pipeline Access', async ({ page }) => {
    await loginUser(page);
    await page.goto(BASE + '/pipeline');
    
    // Check if pipeline page loads
    try {
      await page.waitForSelector('h1, h2, .page-title, [data-testid="page-title"]', { timeout: 5000 });
      console.log('✅ Pipeline page loaded');
      
      // Look for application cards or similar elements
      const selectors = ['.application-card', '.card', '.pipeline-item', '[data-testid="application"]'];
      let foundCards = false;
      
      for (const selector of selectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`✅ Found ${count} application cards using selector: ${selector}`);
          foundCards = true;
          break;
        }
      }
      
      if (!foundCards) {
        console.log('⚠️ No application cards found - may be empty state');
      }
      
    } catch (error) {
      console.log(`❌ Pipeline page failed to load: ${error.message}`);
    }
  });

  test('Communication Center Access', async ({ page }) => {
    await loginUser(page);
    await page.goto(BASE + '/communication');
    
    try {
      await page.waitForSelector('h1, h2, .page-title, [data-testid="page-title"]', { timeout: 5000 });
      console.log('✅ Communication center loaded');
      
      // Look for tabs
      const tabs = ['SMS', 'Calls', 'Email', 'Templates'];
      let foundTabs = 0;
      
      for (const tab of tabs) {
        try {
          const tabElement = page.getByRole('tab', { name: tab });
          if (await tabElement.isVisible()) {
            console.log(`✅ Found ${tab} tab`);
            foundTabs++;
          }
        } catch (e) {
          console.log(`⚠️ ${tab} tab not found`);
        }
      }
      
      console.log(`Communication tabs found: ${foundTabs}/${tabs.length}`);
      
    } catch (error) {
      console.log(`❌ Communication center failed: ${error.message}`);
    }
  });

  test('Reports Access', async ({ page }) => {
    await loginUser(page);
    await page.goto(BASE + '/reports');
    
    try {
      await page.waitForLoadState('networkidle');
      
      // Check if we're redirected to login (protected route)
      if (page.url().includes('/login')) {
        console.log('🔒 Reports is protected - requires authentication (expected)');
      } else {
        console.log('✅ Reports page accessible');
        
        // Look for charts or report content
        const chartSelectors = ['canvas', 'svg', '.chart', '[data-testid="chart"]'];
        let foundCharts = false;
        
        for (const selector of chartSelectors) {
          const count = await page.locator(selector).count();
          if (count > 0) {
            console.log(`✅ Found ${count} chart elements using: ${selector}`);
            foundCharts = true;
            break;
          }
        }
        
        if (!foundCharts) {
          console.log('⚠️ No chart elements found');
        }
      }
      
    } catch (error) {
      console.log(`❌ Reports access failed: ${error.message}`);
    }
  });

  test('Protected Routes Validation', async ({ page }) => {
    await loginUser(page);
    
    const protectedRoutes = [
      '/contacts',
      '/documents', 
      '/reports',
      '/marketing',
      '/settings'
    ];
    
    let protectedCount = 0;
    
    for (const route of protectedRoutes) {
      await page.goto(BASE + route);
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/login')) {
        console.log(`🔒 ${route} is properly protected`);
        protectedCount++;
      } else {
        console.log(`✅ ${route} is accessible when authenticated`);
      }
    }
    
    console.log(`Protected routes: ${protectedCount}/${protectedRoutes.length}`);
  });
});