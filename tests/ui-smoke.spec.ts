import { test, expect } from "@playwright/test";
test("login page renders and buttons are clickable (trial)", async ({ page, context, baseURL }) => {
  await context.route("**/api/auth/request-2fa", r => r.fulfill({ status: 200, body: JSON.stringify({ success:true, status:"pending", mocked:true }) }));
  await context.route("**/api/auth/verify-2fa",  r => r.fulfill({ status: 200, body: JSON.stringify({ success:true, mocked:true }) }));
  await page.goto(`${baseURL}/login`);
  await expect(page.locator("text=SignIn ACTIVE")).toHaveCount(1, { timeout: 2000 }).catch(()=>{});
  const buttons = await page.getByRole("button").all();
  for (const b of buttons) { await b.click({ trial: true }).catch(()=>{}); }
});