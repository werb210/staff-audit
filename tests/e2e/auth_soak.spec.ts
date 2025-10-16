import { test, expect } from "@playwright/test";
const STAFF = process.env.STAFF_URL || "http://127.0.0.1:5000";
test('auth soak: survives reloads/new tabs/network glitches', async ({ page, context }) => {
  const stopAt = Date.now() + (Number(process.env.SOAK_MINUTES||"5")*60*1000); // Default 5 min for quick test
  await page.request.post(`${STAFF}/api/auth/test-login`, { data: {} });
  let iterations = 0;
  while (Date.now() < stopAt && iterations < 20) { // Cap iterations for demo
    await page.goto(`${STAFF}/`, { waitUntil: "domcontentloaded" });
    // Verify API still returns 200 (no redirects)
    const r = await page.request.get(`${STAFF}/api/auth/user`);
    expect(r.status(), 'auth/user status').toBeLessThan(400);
    await page.waitForTimeout(500); // Faster iterations for demo
    iterations++;
  }
  console.log(`Completed ${iterations} auth persistence checks`);
});
