import { test, expect } from "@playwright/test";

const START = process.env.PORTAL_URL || "http://localhost:5173/portal";

test("crawl UI for duplicates & dead controls", async ({ page }) => {
  await page.goto(START);

  // Gather all buttons/menus/tabs by visible text (normalized)
  const texts = new Map<string, number>();
  const els = page.locator('button, [role="button"], [data-testid], [role="menuitem"], [role="tab"]');
  const count = await els.count();

  for (let i=0;i<count;i++){
    const el = els.nth(i);
    const t = (await el.textContent() || "").replace(/\s+/g," ").trim();
    const key = t || (await el.getAttribute("data-testid")) || "";
    if (!key) continue;
    texts.set(key, (texts.get(key)||0)+1);
  }

  const dups = [...texts.entries()].filter(([_,n])=>n>1);
  console.log("DUPLICATE_LABELS_OR_TESTIDS", JSON.stringify(dups, null, 2));

  // Check that critical buttons exist and are clickable
  const critical = [
    "[data-testid='btn-pipeline-load']",
    "[data-testid='btn-contacts-load']",
    "[data-testid='btn-lenders-load']",
    "[data-testid='btn-docs-load']",
    "[data-testid='btn-zip-download']",
    "[data-testid='btn-sms-send']",
    "[data-testid='btn-ocr-run']",
    "[data-testid='btn-banking-run']",
  ];
  for (const sel of critical) {
    const ok = await page.$(sel);
    expect(ok, `Missing critical control ${sel}`).not.toBeNull();
    await page.click(sel).catch(e => { throw new Error(`Unclickable ${sel}: ${e.message}`); });
  }
});