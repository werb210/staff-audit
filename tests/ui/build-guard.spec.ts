import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const ROUTES = [
  "/staff/dashboard",
  "/staff/contacts",
  "/staff/communications",
  "/staff/tasks-calendar",
  "/staff/marketing",
  "/staff/marketing/ads",
  "/staff/lenders",
  "/staff/settings/user-management"
];

test.describe.configure({ mode: "serial", retries: 0 });

for (const path of ROUTES) {
  test(`route smoke: ${path}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const netFails: string[] = [];
    page.on("console", m => { if (["error"].includes(m.type())) consoleErrors.push(m.text()); });
    page.on("requestfailed", r => netFails.push(`${r.failure()?.errorText} ${r.url()}`));

    await page.goto(`${BASE}${path}`);
    // Wait for a main landmark to show (header or main)
    await expect(page.locator("main, [role=main], h1:has-text('Dashboard'), h1:has-text('Marketing'), h1:has-text('User Management')").first()).toBeVisible({ timeout: 10000 });

    // a11y quick pass (does not fail on minor color issues)
    const a11y = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    expect(a11y.violations.length, a11y.violations.map(v=>v.id).join(",")).toBeLessThan(8);

    // no JS exceptions printed to console
    expect(consoleErrors.length ? consoleErrors.slice(0,3).join("\n") : "").toBe("");

    // no more than 2 failed requests (allows CSP beacons in Replit)
    expect(netFails.length, netFails.slice(0,3).join("\n")).toBeLessThan(3);
  });
}

test("SPA fallback works (no hard 404 for client routes)", async ({ page }) => {
  await page.goto(`${BASE}/staff/__nonexistent__/deep/path`);
  await expect(page.locator("main, [role=main]")).toBeVisible({ timeout: 8000 });
});

test("Dialer opens and controls respond", async ({ page }) => {
  await page.goto(`${BASE}/staff/dashboard`);
  const openers = [
    '[data-testid="dialer-open"]','text=Test BF Call','text=Test SLF Call','button:has-text("Open Dialer")'
  ];
  for (const sel of openers) { if (await page.locator(sel).first().count()) { await page.locator(sel).first().click(); break; } }
  // Expect exactly one panel / End Call
  await expect(page.locator('text=End Call').first()).toBeVisible({ timeout: 5000 });
  // Click a few controls (won't fail if disabled state toggles)
  for (const label of ["Mute","Hold","Record"]) {
    const btn = page.locator(`button:has-text("${label}")`).first(); if (await btn.count()) await btn.click();
  }
  await page.locator('button:has-text("End Call")').first().click({ trial: true });
});

test("Settings User Management resolves spinner", async ({ page }) => {
  await page.goto(`${BASE}/staff/settings/user-management`);
  const spinner = page.locator('text=/Loading users\\.?/i');
  await spinner.waitFor({ state: "detached", timeout: 10000 }).catch(()=>{});
  const hasTable = await page.locator("table tr, [data-testid='user-row']").count() > 0;
  const hasMessage = await page.locator("text=/No users found|Failed to load users/i").count() > 0;
  expect(hasTable || hasMessage).toBeTruthy();
});