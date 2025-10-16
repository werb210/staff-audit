import { test, expect } from "@playwright/test";

test("GA page_view is emitted", async ({ page }) => {
  await page.goto("/staff/");
  // allow init
  await page.waitForTimeout(800);
  const calls = await page.evaluate(() => (window as any).__gtagCalls || []);
  expect(Array.isArray(calls)).toBeTruthy();
  const hasPageView = calls.some((c: any[]) => c?.[1] === "page_view");
  expect(hasPageView).toBeTruthy();
});