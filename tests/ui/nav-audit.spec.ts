import { test, expect } from "@playwright/test";
import { startNetworkCapture, saveAudit, reportRow } from "./audit.utils";

const NAV = [
  { label: "Pipeline" },
  { label: "Contacts" },
  { label: "Communications" },
  { label: "Tasks & Calendar", alt: "Tasks" },
  { label: "Reports" },
  { label: "Marketing" },
  { label: "Lenders" },
  { label: "Settings" },
];

test("Top-level navigation works & renders main content", async ({ page }) => {
  const logs = await startNetworkCapture(page);
  const rows: any[] = [];

  await page.goto("/staff/");
  await expect(page.locator("main, [role=main]").first()).toBeVisible();

  for (const item of NAV) {
    const tab = page.getByText(new RegExp(`^${item.label}$`, "i")).first()
      .or(item.alt ? page.getByText(new RegExp(item.alt, "i")).first() : page.getByText(/.^/));

    const ok = await tab.count();
    if (!ok) {
      rows.push(await reportRow("Nav", item.label, "NOT_FOUND"));
      continue;
    }
    await tab.click();
    await page.waitForTimeout(300); // small settle
    const hasMain = await page.locator("main, [role=main]").first().isVisible().catch(() => false);
    rows.push(await reportRow("Nav", item.label, hasMain ? "PASS" : "FAIL"));
  }

  await saveAudit("nav", { rows, logs });
});
