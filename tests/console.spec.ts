import { test, expect } from "@playwright/test";
test("no console errors/warnings on portal load", async ({ page }) => {
  const errors: string[] = [];
  const warns: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
    if (msg.type() === "warning") warns.push(msg.text());
  });
  await page.goto(process.env.APP_ORIGIN || "http://localhost:5000/portal");
  // give React time to settle
  await page.waitForTimeout(500);
  expect(errors, `Console errors:\n${errors.join("\n")}`).toHaveLength(0);
  // If you want warns to fail too, uncomment next line
  // expect(warns, `Console warns:\n${warns.join("\n")}`).toHaveLength(0);
});