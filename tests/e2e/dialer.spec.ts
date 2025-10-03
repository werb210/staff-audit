import { test, expect } from "@playwright/test";

test("Dialer initializes and shows status", async ({ page }) => {
  await page.goto("http://localhost:5000/staff/dashboard");
  await page.click("button:has-text('📞')");
  const status = page.locator("#dialer-status");
  await expect(status).toBeVisible({ timeout: 5000 });
  const text = await status.textContent();
  if (!text?.includes("Dialer ready")) {
    await page.screenshot({ path: "dialer-fail.png" });
    throw new Error(`Dialer failed: ${text}`);
  }
});
