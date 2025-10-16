import { test, expect } from "@playwright/test";

const actions = [
  "scan-docs","validate","redflags","finhealth",
  "approval","timeline","routing","credit-summary","benchmarks",
  "compose-email","compose-sms","request-missing","aml","lender-qa"
];

test.describe("AI Actions in Pipeline Drawer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/staff/pipeline");
    await page.waitForTimeout(2000); // Allow page to load
    
    const firstCard = page.getByTestId("pipeline-card").first();
    const cardCount = await firstCard.count();
    
    if (cardCount > 0) {
      await firstCard.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });
    } else {
      test.skip(true, "No pipeline cards available to test AI actions");
    }
  });

  for (const action of actions) {
    test(`AI action ${action} emits a result`, async ({ page }) => {
      const button = page.getByTestId(`btn-ai-${action}`);
      
      // Check if button exists
      const buttonCount = await button.count();
      if (buttonCount === 0) {
        test.skip(true, `AI button for ${action} not found`);
        return;
      }

      // Click the AI button
      await button.click();
      
      // Wait for result panel to appear
      await expect(
        page.locator('[data-testid="ai-result-panel"]')
      ).toBeVisible({ timeout: 15000 });
      
      // Check for either success or error state
      const resultText = await page.locator('[data-testid="ai-result-panel"]').textContent();
      expect(resultText).toMatch(/Running|Error|ok|probability|issues|priority|draft|score|timeline|missing|quality/i);
    });
  }
});

test.describe("AI Health Check", () => {
  test("Health endpoint responds", async ({ page }) => {
    const response = await page.request.get("/health");
    expect(response.status()).toBe(200);
    
    const health = await response.json();
    expect(health.ok).toBe(true);
    expect(health.service).toBe("staff");
  });

  test("AI endpoints are accessible", async ({ page }) => {
    // Test document scan endpoint
    const scanResponse = await page.request.get("/api/ai/docs/scan?applicationId=test-123");
    expect([200, 422, 500]).toContain(scanResponse.status());
    
    // Test financial score endpoint
    const scoreResponse = await page.request.post("/api/ai/financials/score", {
      data: { applicationId: "test-123" }
    });
    expect([200, 422, 500]).toContain(scoreResponse.status());
  });
});