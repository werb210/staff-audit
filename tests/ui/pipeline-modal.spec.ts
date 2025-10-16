import { test, expect } from "@playwright/test";

test("Pipeline modal shows mapped fields and all documents (no silent crop)", async ({ page, request }) => {
  await page.goto("/staff/");

  // Open first pipeline card
  const firstOpen = page.locator('a:has-text("Open")').first().or(page.getByRole("button", { name: /open/i }).first());
  await expect(firstOpen).toBeVisible();
  await firstOpen.click();

  // Modal visible
  const modal = page.locator("div[role=dialog]").first();
  await expect(modal).toBeVisible();

  // Application tab -> ensure not all dashes
  await page.getByRole("tab", { name: /^Application$/i }).click();
  await page.waitForTimeout(200);

  // If every value cell is just "—", fail loudly
  const values = await modal.locator("div").allTextContents();
  const dashCount = values.filter(v => v.trim() === "—").length;
  expect(dashCount).toBeLessThan(values.length, "All fields are dashes; mapping is broken.");

  // Documents tab -> compare UI count vs API count (no slice(0,4))
  await page.getByRole("tab", { name: /^Documents$/i }).click();
  await page.waitForTimeout(200);

  const uiDocCards = await modal.locator('[data-testid="doc-card"]').count()
    .catch(async () => await modal.locator('img[alt*="doc"], [data-doc-id]').count());
  // pull the current app id from header text (contains id)
  const header = await modal.locator("text=Application ").first().textContent();
  const appId = header?.replace(/.*Application\s+([0-9a-f-]{32,36}).*/i, "$1").trim();

  let apiCount = -1;
  if (appId && /^[0-9a-f-]{32,36}$/i.test(appId)) {
    const API = process.env.STAFF_API_BASE || "http://localhost:5000";
    const res = await request.get(`${API}/api/applications/${appId}/documents?limit=200`);
    if (res.ok()) {
      const j = await res.json();
      apiCount = Array.isArray(j) ? j.length : (j?.items?.length || 0);
    }
  }

  expect(apiCount).toBeGreaterThanOrEqual(0);
  expect(uiDocCards).toBeGreaterThanOrEqual(apiCount); // never show fewer than server
});