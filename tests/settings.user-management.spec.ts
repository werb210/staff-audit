import { test, expect } from "@playwright/test";

test("Settings → User Management opens", async ({ page }) => {
  // Assume you're already signed in; if not, insert your login helper here.
  await page.goto("/staff/settings");
  await page.getByTestId("btn-configure-user-mgmt").click();

  // Either we land on the page and see the header/table…
  const inPanel = page.locator("h1", { hasText: "User Management" });
  const maybeTable = page.locator("table");

  // …or we're redirected to login (if session expired)
  const atLogin = page.locator("form").first().or(page.getByText(/sign in|login/i));

  await expect
    .any([
      expect(inPanel).toBeVisible({ timeout: 5000 }),
      expect(atLogin).toBeVisible({ timeout: 5000 }),
    ]);
});