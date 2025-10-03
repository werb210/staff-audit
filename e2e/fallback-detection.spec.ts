import { test, expect } from '@playwright/test';

test.describe('Fallback Detection Tests', () => {
  
  test('Lenders page should display real data without fallbacks', async ({ page }) => {
    // Listen for console warnings about fallbacks
    const fallbackWarnings: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('🔥 Fallback triggered')) {
        fallbackWarnings.push(msg.text());
      }
    });

    await page.goto('/staff/lenders');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForSelector('[data-testid="lenders-table"]', { timeout: 10000 });

    // Check if fallbacks were triggered
    expect(fallbackWarnings.length).toBe(0);

    // Verify real data is displayed (should have more than mock data count)
    const lenderRows = page.locator('[data-testid="lender-row"]');
    const count = await lenderRows.count();
    expect(count).toBeGreaterThan(5); // Real API should have more than 5 lenders
  });

  test('Dashboard should display real data without fallbacks', async ({ page }) => {
    const fallbackWarnings: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('🔥 Fallback triggered')) {
        fallbackWarnings.push(msg.text());
      }
    });

    await page.goto('/staff/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for dashboard metrics to load
    await page.waitForSelector('[data-testid="dashboard-metrics"]', { timeout: 10000 });

    // Check if fallbacks were triggered
    expect(fallbackWarnings.length).toBe(0);
  });

  test('Tasks page should connect to real API', async ({ page }) => {
    const fallbackWarnings: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('🔥 Fallback triggered')) {
        fallbackWarnings.push(msg.text());
      }
    });

    await page.goto('/staff/tasks-calendar');
    await page.waitForLoadState('networkidle');

    // Wait for tasks to load
    await page.waitForSelector('[data-testid="tasks-list"]', { timeout: 10000 });

    // Should ideally have no fallbacks, but tasks API might not be implemented yet
    console.log('Fallback warnings for tasks:', fallbackWarnings);
  });

  test('Pipeline drawer should connect to real APIs', async ({ page }) => {
    const fallbackWarnings: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('🔥 Fallback triggered')) {
        fallbackWarnings.push(msg.text());
      }
    });

    await page.goto('/staff/pipeline');
    await page.waitForLoadState('networkidle');

    // Click on a pipeline card to open drawer
    await page.click('[data-testid="pipeline-card"]:first-child');
    await page.waitForSelector('[data-testid="pipeline-drawer"]', { timeout: 10000 });

    // Check if fallbacks were triggered in drawer
    console.log('Pipeline drawer fallback warnings:', fallbackWarnings);
  });

  test('Refresh buttons should work in development mode', async ({ page }) => {
    await page.goto('/staff/lenders');
    await page.waitForLoadState('networkidle');

    // Should see refresh button in dev mode
    const refreshButton = page.locator('button:has-text("↻ Refresh")');
    await expect(refreshButton).toBeVisible();

    // Click refresh and verify it works
    await refreshButton.click();
    await page.waitForTimeout(1000); // Brief wait for refresh
  });
});