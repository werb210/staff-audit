import { test, expect } from "@playwright/test";

test("Dialer opens and toggles change internal state", async ({ page }) => {
  await page.goto("/staff/");
  await page.locator('[data-testid="dialer-open"]').click();
  await expect(page.getByText(/Recording consent/i).first()).toBeVisible();

  const before = await page.evaluate(() => (window as any).__dialer?.model || null);

  const mute = page.getByRole("button", { name: /^Mute$/i }).first();
  if (await mute.count()) await mute.click();

  const after = await page.evaluate(() => (window as any).__dialer?.model || null);
  expect(before).not.toEqual(after); // ensure some state changed

  // silo pill
  const pill = page.getByText(/^(BF|SLF)$/).first();
  if (await pill.count()) {
    const s1 = await page.evaluate(() => (window as any).__dialer?.model?.silo);
    await pill.click();
    const s2 = await page.evaluate(() => (window as any).__dialer?.model?.silo);
    expect(s1).not.toEqual(s2);
  }
});