import { test, expect } from "@playwright/test";

const BASE = (process.env.UI_BASE || "http://localhost:5000").replace(/\/$/,"");
const ROUTES = [
  "/staff",
  "/staff/lenders",
  "/staff/lender-products",
  "/staff/contacts",
  "/staff/applications",
  "/staff/documents",
  "/staff/reports",
  "/staff/settings"
];

const FALLBACK_PATTERNS = [
  /Using fallback/i,
  /fallback data/i,
  /mock data/i,
  /loaded fixture/i
];

test("runtime-fallback-audit", async ({ page }) => {
  const logs: { route: string; message: string }[] = [];
  page.on("console", (msg) => {
    const t = msg.text();
    if (FALLBACK_PATTERNS.some(p=>p.test(t))) {
      logs.push({ route: page.url().replace(BASE,""), message: t });
    }
  });

  for (const r of ROUTES) {
    await page.goto(BASE + r, { waitUntil: "domcontentloaded" });
    // give data loaders a moment
    await page.waitForTimeout(600);
    // click any obvious filters to trigger data reloads
    const clickables = page.locator('button, [role="button"], a');
    const count = await clickables.count();
    for (let i=0;i<Math.min(count, 5);i++) {
      const el = clickables.nth(i);
      const txt = (await el.textContent()) || "";
      if (/delete|logout/i.test(txt)) continue;
      try { await el.click({ timeout: 300 }).catch(()=>{}); } catch {}
    }
  }

  // write JSON artifact
  const fs = await import("fs");
  const out = {
    base: BASE,
    routes: ROUTES,
    totalFallbackEvents: logs.length,
    byRoute: ROUTES.map(r => ({
      route: r,
      events: logs.filter(l=>l.route.endsWith(r)).map(l=>l.message)
    }))
  };
  fs.mkdirSync("reports",{recursive:true});
  fs.writeFileSync("reports/FALLBACK_RUNTIME_AUDIT.json", JSON.stringify(out,null,2));
  console.log("✅ Wrote reports/FALLBACK_RUNTIME_AUDIT.json");
  // fail test if any fallback seen
  expect(out.totalFallbackEvents, "No runtime fallbacks should be logged").toBe(0);
});