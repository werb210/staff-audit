import { test, expect } from "@playwright/test";

test("Marketing connect triggers OAuth endpoint (not dashboard redirect)", async ({ page }) => {
  await page.goto("/staff/");
  await page.getByText(/^Marketing$/i).click();

  const reqs: string[] = [];
  page.on("request", r => reqs.push(r.url()));

  const btn = page.getByRole("button", { name: /connect account/i }).first();
  if (await btn.count()) await btn.click();

  await page.waitForTimeout(500);
  const hitAuth = reqs.some(u => /\/api\/ads\/auth|\/api\/linkedin\/auth|\/oauth/.test(u));
  expect(hitAuth).toBeTruthy();
});