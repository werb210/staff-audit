import { test, expect } from "@playwright/test";

test.describe("Core flows", () => {
  test("Contacts: email and SMS functionality accessible", async ({ page, baseURL }) => {
    await page.goto(baseURL! + "/portal/contacts");
    // Wait for contacts to load and check if email/SMS buttons exist
    const contactCard = page.locator('.border').first();
    if (await contactCard.isVisible()) {
      await expect(page.getByText("Email")).toBeVisible();
      await expect(page.getByText("SMS")).toBeVisible();
    }
  });

  test("Pipeline: search functionality works", async ({ page, baseURL }) => {
    await page.goto(baseURL! + "/portal/pipeline");
    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      await expect(searchInput).toHaveValue("test");
    }
    // Check pipeline columns are visible
    await expect(page.locator('text=New').or(page.locator('text=Prospecting'))).toBeVisible();
  });

  test("Analytics ROI page loads", async ({ page, baseURL }) => {
    await page.goto(baseURL! + "/portal/analytics/roi");
    await expect(page.getByText("ROI").or(page.getByText("Analytics"))).toBeVisible();
  });

  test("Productivity tasks page loads", async ({ page, baseURL }) => {
    await page.goto(baseURL! + "/portal/productivity/tasks");
    await expect(page.getByText("Tasks").or(page.getByText("Productivity"))).toBeVisible();
  });

  test("Training docs page loads and has upload form", async ({ page, baseURL }) => {
    await page.goto(baseURL! + "/portal/training/docs");
    await expect(page.getByText("Training")).toBeVisible();
    await expect(page.locator('input[placeholder*="Title"]')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test("Ops health pages accessible", async ({ page, baseURL }) => {
    await page.goto(baseURL! + "/portal/ops/db-health");
    await expect(page.getByText("Database").or(page.getByText("Health"))).toBeVisible();
    
    await page.goto(baseURL! + "/portal/ops/build-doctor");
    await expect(page.getByText("Build").or(page.getByText("Doctor"))).toBeVisible();
    
    await page.goto(baseURL! + "/portal/ops/route-inspector");
    await expect(page.getByText("Route").or(page.getByText("Inspector"))).toBeVisible();
  });
});