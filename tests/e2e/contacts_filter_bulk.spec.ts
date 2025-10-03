import { test, expect, request } from '@playwright/test';
const BASE = process.env.STAFF_URL!;
test('filters + bulk apply by filter', async ({ page }) => {
  const ctx = await request.newContext();
  await ctx.patch(`${BASE}/api/contacts/demo-contact-123`, { data: { state: 'new' } });
  await page.goto(`${BASE}/contacts?state=new`, { waitUntil:'networkidle' });
  await page.getByText(/Bulk update/i).scrollIntoViewIfNeeded();
  await page.getByLabel('lender', { exact:false }).first().check();
  await page.getByText(/Apply to all in current filter/i).click();
  const r = await ctx.get(`${BASE}/api/contacts?state=new&audience=lender`);
  expect(r.ok()).toBeTruthy();
});
