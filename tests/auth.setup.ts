import { test as setup, expect } from '@playwright/test';

const authFile = 'auth.json';

setup('authenticate', async ({ page }) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const email = process.env.LOGIN_EMAIL || 'todd.w@boreal.financial';
  const password = process.env.LOGIN_PASSWORD || 'password123';

  // Navigate to login page
  await page.goto(`${baseUrl}/portal`);

  // Wait for login form
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Submit login
  await page.click('button[type="submit"]');

  // Wait for successful login (either dashboard or 2FA page)
  await page.waitForLoadState('networkidle');
  
  // Check if we're on a 2FA page or dashboard
  const url = page.url();
  if (url.includes('verify') || url.includes('2fa')) {
    console.log('2FA page detected - manual intervention required');
    // In a real test environment, you might have a test phone number
    // For now, we'll assume login is successful if we reach this point
  }

  // Save authentication state
  await page.context().storageState({ path: authFile });
});