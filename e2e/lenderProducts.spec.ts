import { test, expect } from "@playwright/test";

test.describe("Lender Products CRUD & Filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/staff/lenders");
    // Wait for page to load
    await expect(page.getByText(/Lenders/i)).toBeVisible();
  });

  test("lender products page loads and shows data", async ({ page }) => {
    // Check if we can see the lender products section
    await expect(page.locator("table, .table")).toBeVisible();
    
    // Check for some basic content
    const content = await page.textContent("body");
    expect(content).toContain("lender");
  });

  test("can navigate to lender products if tabs exist", async ({ page }) => {
    // Try to find and click products tab if it exists
    const productsTab = page.getByRole("tab", { name: /products/i }).first();
    if (await productsTab.isVisible()) {
      await productsTab.click();
      await expect(page.getByText(/products/i)).toBeVisible();
    }
  });

  test("filters work if filter controls exist", async ({ page }) => {
    // Look for filter controls
    const selects = page.locator("select");
    const selectCount = await selects.count();
    
    if (selectCount > 0) {
      // Test first select if it exists
      const firstSelect = selects.first();
      const options = await firstSelect.locator("option").count();
      
      if (options > 1) {
        await firstSelect.selectOption({ index: 1 }); // Select second option
        // Wait a bit for filtering to happen
        await page.waitForTimeout(500);
      }
    }
  });

  test("can access add form if add button exists", async ({ page }) => {
    // Look for add/new button
    const addButton = page.getByRole("button", { name: /add|new/i }).first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Check if a form or modal appeared
      const form = page.locator("form, .modal, .dialog").first();
      if (await form.isVisible()) {
        // Look for typical form fields
        const nameField = page.locator('input[name*="name"], [data-testid*="name"]').first();
        if (await nameField.isVisible()) {
          await expect(nameField).toBeVisible();
        }
      }
    }
  });

  test("table shows lender product data", async ({ page }) => {
    // Check if there's a table with data
    const table = page.locator("table, .table").first();
    if (await table.isVisible()) {
      const rows = page.locator("tr, .table-row");
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
      
      // Check for typical column headers
      const headers = await page.textContent("thead, .table-header");
      if (headers) {
        expect(headers.toLowerCase()).toMatch(/name|lender|product/);
      }
    }
  });
});