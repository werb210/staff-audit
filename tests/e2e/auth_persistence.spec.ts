import { test, expect } from "@playwright/test";
const ORIGIN = process.env.STAFF_URL || `http://localhost:${process.env.PORT||5000}`;
test("login persists across reloads & new tab", async ({ context, page }) => {
  const r = await page.request.post(`${ORIGIN}/api/auth/test-login`, { data:{} }); 
  expect(r.ok()).toBeTruthy();
  const me = await page.request.get(`${ORIGIN}/api/auth/user`); 
  expect(me.ok()).toBeTruthy();
  await page.goto(`${ORIGIN}/`); 
  await page.reload();
  const me2 = await page.request.get(`${ORIGIN}/api/auth/user`); 
  expect(me2.ok()).toBeTruthy();
  const page2 = await context.newPage();
  const me3 = await page2.request.get(`${ORIGIN}/api/auth/user`); 
  expect(me3.ok()).toBeTruthy();
});