import { test, expect } from "@playwright/test";

test("Communication Center shows threads pane and not raw contacts list", async ({ page }) => {
  await page.goto("/comm"); // adjust route if different
  await expect(page.getByTestId("comm-threads")).toBeVisible();
  await expect(page.getByTestId("comm-messages")).toBeVisible();
  // Should not fetch /api/contacts as primary data source
  const requests: string[] = [];
  page.on("request", req => requests.push(req.url()));
  await page.waitForTimeout(500); // allow initial fetch
  const calledContacts = requests.some(u => u.includes("/api/contacts"));
  expect(calledContacts).toBeFalsy();
});

test("Communication Center composer UI with templates", async ({ page }) => {
  await page.goto("/comm");
  await expect(page.getByTestId("comm-threads")).toBeVisible();
  
  // Click on first conversation
  await page.click('[data-testid="comm-threads"] button:first-child');
  
  // Composer should appear
  await expect(page.getByRole("button", { name: "SMS" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Email" })).toBeVisible();
  await expect(page.getByRole("combobox")).toBeVisible(); // Templates dropdown
  
  // Test SMS mode
  await page.click('button:has-text("SMS")');
  await expect(page.getByPlaceholder("To phone")).toBeVisible();
  await expect(page.getByPlaceholder("SMS message")).toBeVisible();
  
  // Test Email mode
  await page.click('button:has-text("Email")');
  await expect(page.getByPlaceholder("To email")).toBeVisible();
  await expect(page.getByPlaceholder("Subject")).toBeVisible();
  await expect(page.getByPlaceholder("Email body")).toBeVisible();
});