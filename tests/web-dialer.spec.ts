import { test, expect } from "@playwright/test";

test("Web Dialer renders and requests a token", async ({ page }) => {
  const urls: string[] = [];
  page.on("request", r => urls.push(r.url()));

  await page.goto("/comm");
  await expect(page.getByText("Web Dialer")).toBeVisible();

  // token fetch should occur
  await page.waitForTimeout(800);
  expect(urls.some(u => u.includes("/api/voice/token"))).toBeTruthy();
});

test("Web Dialer shows HUD and token fetch", async ({ page }) => {
  const urls: string[] = [];
  page.on("request", r => urls.push(r.url()));

  await page.goto("/comm");
  await expect(page.getByText("Web Dialer")).toBeVisible();

  await page.waitForTimeout(800);
  expect(urls.some(u => u.includes("/api/voice/token"))).toBeTruthy();

  // HUD status should be visible initially
  await expect(page.getByText(/Ready|Stub Mode|Initializing/)).toBeVisible();
});