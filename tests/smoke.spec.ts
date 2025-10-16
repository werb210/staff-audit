import { test, expect } from "@playwright/test";

async function guardConsole(page: any) {
  const errors: string[] = [];
  page.on("console", (msg: any) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

const routes = [
  "/", 
  "/portal", 
  "/portal/contacts", 
  "/portal/pipeline", 
  "/portal/lenders", 
  "/portal/analytics/roi", 
  "/portal/productivity/tasks", 
  "/portal/training/docs",
  "/portal/ops/build-doctor"
];

for (const path of routes) {
  test(`route ${path} renders without console errors`, async ({ page, baseURL }) => {
    const errs = await guardConsole(page);
    await page.goto(baseURL! + path);
    await expect(page).toHaveTitle(/./); // any title
    // ensure root element exists
    const root = await page.locator("#root, #app").first();
    await expect(root).toBeVisible();
    expect(errs, `Console errors on ${path}`).toHaveLength(0);
  });
}