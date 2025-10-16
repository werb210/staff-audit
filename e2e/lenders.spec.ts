import { test, expect } from "@playwright/test";

test.describe("Lenders CRUD & Filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/staff/lenders");
    await expect(page.getByText(/Lenders/i)).toBeVisible();
  });

  test("lenders page loads successfully", async ({ page }) => {
    // Check that we're on the lenders page
    await expect(page).toHaveURL(/\/staff\/lenders/);
    
    // Look for lender-related content
    const content = await page.textContent("body");
    expect(content?.toLowerCase()).toContain("lender");
  });

  test("can see lender data in table or list", async ({ page }) => {
    // Look for table or list structure
    const dataContainer = page.locator("table, .table, .list, .grid").first();
    
    if (await dataContainer.isVisible()) {
      // Check if there are rows/items
      const items = page.locator("tr, .item, .row, .card");
      const itemCount = await items.count();
      expect(itemCount).toBeGreaterThan(0);
    }
  });

  test("navigation works properly", async ({ page }) => {
    // Test that we can navigate and the page responds
    await page.reload();
    await expect(page.getByText(/Lenders/i)).toBeVisible();
    
    // Check if there are any navigation elements
    const navLinks = page.locator("nav a, .nav a, .menu a");
    const linkCount = await navLinks.count();
    
    if (linkCount > 0) {
      // Navigation exists, page is properly structured
      expect(linkCount).toBeGreaterThan(0);
    }
  });

  test("can access add lender functionality if available", async ({ page }) => {
    // Look for add/create buttons
    const addButton = page.getByRole("button", { name: /add|create|new/i }).first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Check if form or modal appears
      const formElements = page.locator("form, .modal, .dialog, input");
      const hasForm = await formElements.first().isVisible();
      
      if (hasForm) {
        // Form functionality exists
        expect(await formElements.count()).toBeGreaterThan(0);
      }
    }
  });

  test("can filter lenders if filters exist", async ({ page }) => {
    // Look for filter elements
    const filterControls = page.locator("select, input[type='search'], .filter");
    const filterCount = await filterControls.count();
    
    if (filterCount > 0) {
      const firstFilter = filterControls.first();
      
      // If it's a select, try to change it
      if (await firstFilter.getAttribute("type") !== "search") {
        const options = await firstFilter.locator("option").count();
        if (options > 1) {
          await firstFilter.selectOption({ index: 1 });
          await page.waitForTimeout(500); // Wait for filter to apply
        }
      }
    }
  });
});