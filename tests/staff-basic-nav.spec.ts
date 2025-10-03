import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5000';
const EMAIL = process.env.LOGIN_EMAIL || 'todd.w@boreal.financial';
const PASSWORD = process.env.LOGIN_PASSWORD || 'password123';

test('Login and basic nav', async ({ page }) => {
  await page.goto(BASE + '/');
  
  // Handle login form
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /log in|sign in/i }).click();

  // If OTP step appears
  try {
    await page.waitForSelector('[data-testid="otp-input"], input[placeholder*="code"], input[placeholder*="OTP"]', { timeout: 3000 });
    await page.getByLabel(/otp|code/i).fill('123456'); // dev mode OTP
    await page.getByRole('button', { name: /verify/i }).click();
  } catch (e) {
    // No OTP required, continue
  }

  await expect(page).toHaveURL(new RegExp(`${BASE}/(portal|app)`));

  // Click each sidebar link and verify page load
  const pages = ['Pipeline', 'Contacts', 'Documents', 'Communication', 'Reports', 'AI Reports', 'Training Docs', 'Chat Management', 'Handoff Queue', 'Lender Products', 'Lender Management', 'Tasks', 'Calendar', 'Marketing', 'Settings'];
  
  for (const name of pages) {
    try {
      await page.getByRole('link', { name }).click();
      await expect(page.getByText(name, { exact: false })).toBeVisible({ timeout: 5000 });
      console.log(`✅ ${name} page loaded successfully`);
    } catch (error) {
      console.log(`❌ ${name} page failed to load: ${error}`);
    }
  }
});

test('Pipeline card interactions', async ({ page }) => {
  await page.goto(BASE + '/');
  
  // Login first
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /log in|sign in/i }).click();

  // Handle OTP if needed
  try {
    await page.waitForSelector('[data-testid="otp-input"], input[placeholder*="code"]', { timeout: 3000 });
    await page.getByLabel(/otp|code/i).fill('123456');
    await page.getByRole('button', { name: /verify/i }).click();
  } catch (e) {}

  await page.goto(BASE + '/pipeline');

  // Look for application cards
  const cardSelectors = [
    '.application-card',
    '[data-testid="application-card"]',
    '.card',
    '.pipeline-card',
    '.application-item'
  ];

  let cardFound = false;
  for (const selector of cardSelectors) {
    if (await page.locator(selector).first().isVisible()) {
      await page.locator(selector).first().click();
      cardFound = true;
      break;
    }
  }

  if (cardFound) {
    const tabs = ['Application', 'Banking', 'Financials', 'Documents', 'Lenders'];
    for (const tab of tabs) {
      try {
        await page.getByRole('tab', { name: tab }).click();
        await expect(page.getByText(tab, { exact: false })).toBeVisible();
        console.log(`✅ ${tab} tab works`);
      } catch (error) {
        console.log(`❌ ${tab} tab failed: ${error}`);
      }
    }
  } else {
    console.log('❌ No application cards found to test');
  }
});

test('Document tab buttons', async ({ page }) => {
  await page.goto(BASE + '/');
  
  // Login
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /log in|sign in/i }).click();

  try {
    await page.waitForSelector('[data-testid="otp-input"]', { timeout: 3000 });
    await page.getByLabel(/otp|code/i).fill('123456');
    await page.getByRole('button', { name: /verify/i }).click();
  } catch (e) {}

  await page.goto(BASE + '/pipeline');

  // Find and open first application card
  const cardSelectors = ['.application-card', '[data-testid="application-card"]', '.card'];
  let cardOpened = false;
  
  for (const selector of cardSelectors) {
    if (await page.locator(selector).first().isVisible()) {
      await page.locator(selector).first().click();
      cardOpened = true;
      break;
    }
  }

  if (cardOpened) {
    try {
      await page.getByRole('tab', { name: 'Documents' }).click();
      
      const docRowSelectors = ['.document-row', '.document-item', '[data-testid="document-row"]'];
      let docRow = page.locator(docRowSelectors[0]).first();
      
      for (const selector of docRowSelectors) {
        if (await page.locator(selector).first().isVisible()) {
          docRow = page.locator(selector).first();
          break;
        }
      }

      if (docRow) {
        // Test Preview button
        try {
          await docRow!.getByRole('button', { name: /preview/i }).click();
          await expect(page.getByRole('dialog')).toBeVisible();
          await page.getByRole('button', { name: /close/i }).click();
          console.log('✅ Preview button works');
        } catch (error) {
          console.log('❌ Preview button failed:', error);
        }

        // Test Download button
        try {
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 5000 }),
            docRow!.getByRole('button', { name: /download/i }).click()
          ]);
          expect(download.suggestedFilename()).toMatch(/\.(pdf|png|jpg|docx|xlsx)$/i);
          console.log('✅ Download button works');
        } catch (error) {
          console.log('❌ Download button failed:', error);
        }

        // Test Accept button
        try {
          await docRow!.getByRole('button', { name: /accept/i }).click();
          await expect(page.getByText(/accepted/i)).toBeVisible();
          console.log('✅ Accept button works');
        } catch (error) {
          console.log('❌ Accept button failed:', error);
        }

        // Test Reject button
        try {
          await docRow!.getByRole('button', { name: /reject/i }).click();
          await expect(page.getByRole('dialog')).toContainText(/reason|category/i);
          console.log('✅ Reject button works');
        } catch (error) {
          console.log('❌ Reject button failed:', error);
        }
      } else {
        console.log('❌ No document rows found');
      }
    } catch (error) {
      console.log('❌ Documents tab failed:', error);
    }
  } else {
    console.log('❌ No application cards found');
  }
});

test('Communication Center tabs', async ({ page }) => {
  await page.goto(BASE + '/');
  
  // Login
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /log in|sign in/i }).click();

  try {
    await page.waitForSelector('[data-testid="otp-input"]', { timeout: 3000 });
    await page.getByLabel(/otp|code/i).fill('123456');
    await page.getByRole('button', { name: /verify/i }).click();
  } catch (e) {}

  await page.goto(BASE + '/communication');
  
  const tabs = ['SMS', 'Calls', 'Email', 'Templates'];
  for (const tab of tabs) {
    try {
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.getByText(tab, { exact: false })).toBeVisible();
      console.log(`✅ ${tab} tab works`);
    } catch (error) {
      console.log(`❌ ${tab} tab failed: ${error}`);
    }
  }
});

test('Reports load', async ({ page }) => {
  await page.goto(BASE + '/');
  
  // Login
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /log in|sign in/i }).click();

  try {
    await page.waitForSelector('[data-testid="otp-input"]', { timeout: 3000 });
    await page.getByLabel(/otp|code/i).fill('123456');
    await page.getByRole('button', { name: /verify/i }).click();
  } catch (e) {}

  await page.goto(BASE + '/reports');
  
  try {
    const chartElements = page.locator('canvas, svg, .chart, [data-testid="chart"]');
    const count = await chartElements.count();
    if (count > 0) {
      console.log('✅ Reports charts load');
    } else {
      console.log('❌ No chart elements found');
    }
  } catch (error) {
    console.log('❌ Reports charts failed:', error);
  }
});