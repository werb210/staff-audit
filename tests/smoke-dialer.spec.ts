import { test, expect } from "@playwright/test";

test("SMS login and dialer initializes", async ({ page }) => {
  // Open login page
  await page.goto("http://localhost:5000/login");

  // Fill email
  await page.fill('input[name="email"]', "todd.w@boreal.financial");
  await page.click('button:has-text("Send Code")');

  // Simulate receiving SMS code (replace with mock/test hook)
  const code = "123456"; // replace with test stub
  await page.fill('input[name="code"]', code);
  await page.click('button:has-text("Verify")');

  // Expect dashboard
  await expect(page).toHaveURL(/.*dashboard/);

  // Open dialer
  await page.click('[data-testid="dialer-fab"]');

  // Check dialer initializes
  await page.waitForSelector('[data-testid="dialer-ready"]', { timeout: 10000 });
});
