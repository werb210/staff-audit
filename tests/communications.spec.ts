import { test, expect } from "@playwright/test";

test.describe("Communication Center", () => {
  test("loads and switches tabs (desktop)", async ({ page }) => {
    await page.goto("/communications");
    await expect(page.getByText("Communication Center")).toBeVisible();
    
    // Test SMS tab (default)
    await expect(page.getByRole("button", { name: "Send SMS" })).toBeVisible();
    
    // Test Calls tab
    await page.getByRole("tab", { name: "Calls" }).click();
    await expect(page.getByRole("button", { name: "Start Call" })).toBeVisible();
    
    // Test Email tab
    await page.getByRole("tab", { name: "Email" }).click();
    await expect(page.getByRole("button", { name: "Send Email" })).toBeVisible();
    
    // Test Templates tab
    await page.getByRole("tab", { name: "Templates" }).click();
    await expect(page.getByText("Communication Templates")).toBeVisible();
  });

  test("SMS send button disables without inputs", async ({ page }) => {
    await page.goto("/communications");
    await page.getByRole("tab", { name: "SMS" }).click();
    await expect(page.getByRole("button", { name: "Send SMS" })).toBeDisabled();
    
    // Fill contact ID only
    await page.getByPlaceholder("Enter contact UUID").fill("test-contact-id");
    await expect(page.getByRole("button", { name: "Send SMS" })).toBeDisabled();
    
    // Fill phone number only
    await page.getByPlaceholder("+1234567890").fill("+1234567890");
    await expect(page.getByRole("button", { name: "Send SMS" })).toBeDisabled();
    
    // Fill message - now should be enabled
    await page.getByPlaceholder("Type your message...").fill("Test message");
    await expect(page.getByRole("button", { name: "Send SMS" })).toBeEnabled();
  });

  test("displays templates correctly", async ({ page }) => {
    await page.goto("/communications");
    await page.getByRole("tab", { name: "Templates" }).click();
    
    // Should show template cards
    await expect(page.getByText("Welcome SMS")).toBeVisible();
    await expect(page.getByText("Follow Up Email")).toBeVisible();
    await expect(page.getByText("Document Request")).toBeVisible();
    await expect(page.getByText("Approval Email")).toBeVisible();
    
    // Check channel badges
    await expect(page.getByText("SMS").first()).toBeVisible();
    await expect(page.getByText("EMAIL").first()).toBeVisible();
  });

  test("email form validation works", async ({ page }) => {
    await page.goto("/communications");
    await page.getByRole("tab", { name: "Email" }).click();
    
    // Button should be disabled initially
    await expect(page.getByRole("button", { name: "Send Email" })).toBeDisabled();
    
    // Fill all fields
    await page.getByPlaceholder("Enter contact UUID").fill("test-contact-id");
    await page.getByPlaceholder("recipient@example.com").fill("test@example.com");
    await page.getByPlaceholder("Email subject").fill("Test Subject");
    await page.getByPlaceholder("Email body (HTML supported)").fill("Test email body");
    
    // Button should now be enabled
    await expect(page.getByRole("button", { name: "Send Email" })).toBeEnabled();
  });

  test("call form validation works", async ({ page }) => {
    await page.goto("/communications");
    await page.getByRole("tab", { name: "Calls" }).click();
    
    // Button should be disabled initially
    await expect(page.getByRole("button", { name: "Start Call" })).toBeDisabled();
    
    // Fill contact ID
    await page.getByPlaceholder("Enter contact UUID").fill("test-contact-id");
    await expect(page.getByRole("button", { name: "Start Call" })).toBeDisabled();
    
    // Fill phone number
    await page.getByPlaceholder("+1234567890").fill("+1234567890");
    
    // Button should now be enabled
    await expect(page.getByRole("button", { name: "Start Call" })).toBeEnabled();
  });
});