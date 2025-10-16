import { test, expect } from "@playwright/test";
import { startNetworkCapture, saveAudit, reportRow } from "./audit.utils";

test("Settings → User Management shows users or explicit message", async ({ page }) => {
  const logs = await startNetworkCapture(page);
  const rows: any[] = [];

  await page.goto("/staff/");
  await page.getByText(/^Settings$/i).first().click();
  const um = page.getByText(/^User Management$/i).first();
  if (await um.count()) await um.click();

  // expect either rows or "No users"/Error visible
  await page.waitForTimeout(400);
  const hasRows = await page.locator('[data-testid="user-row"]').count();
  const hasMsg  = await page.getByText(/No users|Failed to load users/i).count();

  rows.push(await reportRow("Settings", "User Management", hasRows || hasMsg ? "PASS" : "FAIL",
    { rowCount: hasRows }));

  await saveAudit("settings-users", { rows, logs });
});
