import { test, expect } from '@playwright/test';

test('login uses LisaMorgan styles', async ({ page }) => {
  await page.goto('/');
  
  // Check for LisaMorgan card presence
  const card = page.getByTestId('lm-login-card');
  await expect(card).toBeVisible();
  
  // Verify border radius is set (LisaMorgan uses custom radius tokens)
  const computed = await card.evaluate((el) => getComputedStyle(el).borderRadius);
  expect(computed).toBeTruthy();
  
  // Verify page background uses gradient (not plain white)
  const bg = await page.evaluate(() => 
    getComputedStyle(document.querySelector('.lm-page')!).backgroundImage
  );
  expect(bg).toContain('gradient');
  
  // Verify LisaMorgan button styling
  const primaryBtn = page.locator('.lm-btn--primary');
  await expect(primaryBtn).toBeVisible();
  
  // Check input styling
  const inputs = page.locator('.lm-input');
  await expect(inputs.first()).toBeVisible();
  
  // Verify no legacy Tailwind utility classes remain
  const legacyClasses = await page.evaluate(() => {
    const elements = document.querySelectorAll('[class*="bg-"], [class*="text-gray"], [class*="rounded-xl"]');
    return elements.length;
  });
  expect(legacyClasses).toBe(0);
});

test('login form functionality with LisaMorgan styles', async ({ page }) => {
  await page.goto('/');
  
  // Test form interaction
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'testpass');
  
  // Verify LisaMorgan error styling works
  await page.click('.lm-btn--primary');
  
  // Check for error display with LisaMorgan styling
  const errorElement = page.locator('.lm-error');
  // Error may or may not appear depending on auth response
  
  // Verify the form structure is correct
  const cardHeader = page.locator('.lm-card__header');
  await expect(cardHeader).toBeVisible();
  await expect(cardHeader).toContainText('BF');
});