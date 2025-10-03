// e2e/buttons.comprehensive.spec.ts
import { test, expect } from "@playwright/test";

const BASE = process.env.UI_URL || "http://localhost:5000/staff";
const tabs = ["/staff", "/staff/lenders", "/staff/contacts", "/staff/pipeline", "/staff/reports", "/staff/settings"];

test.describe("Buttons & Navigation (comprehensive)", () => {
  for (const t of tabs) {
    test(`scan ${t}`, async ({ page }) => {
      await page.goto(t, { waitUntil: "domcontentloaded" });
      const btns = await page.$$('button, a[role="button"], [data-route], nav a');
      expect(btns.length).toBeGreaterThan(0);

      const skip = /(delete|remove|logout|danger|reset)/i;
      let errors: string[] = [];

      for (const el of btns) {
        const label = (await el.textContent())?.trim() || (await el.getAttribute("aria-label")) || (await el.getAttribute("data-route")) || "";
        if (skip.test(label)) continue;
        try {
          await el.hover({ trial: true });
          // trial: verify interactability without actually performing destructive actions
          await el.click({ trial: true });
        } catch (e:any) {
          errors.push(`${t}: "${label || "<unnamed>"}" -> ${e?.message || e}`);
        }
      }

      if (errors.length) {
        console.log("⚠️ Button issues:\n" + errors.slice(0,20).join("\n"));
      }
      expect(errors.length, "buttons with interaction issues").toBe(0);
    });
  }
});