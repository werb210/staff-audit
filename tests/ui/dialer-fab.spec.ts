import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:5000';

test.describe('Dialer FAB functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a staff page where the FAB should be visible
    await page.goto(`${BASE}/staff/settings`);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('Dialer FAB should be visible and clickable', async ({ page }) => {
    // Find the FAB by testid
    const fab = page.getByTestId('dialer-fab');
    
    // Verify it's visible
    await expect(fab).toBeVisible();
    
    // Verify it has correct attributes
    await expect(fab).toHaveAttribute('aria-label', 'Open Dialer');
    await expect(fab).toHaveAttribute('type', 'button');
    
    // Click the FAB
    await fab.click();
    
    // Verify the dialer panel opens (assuming it has a testid)
    // This might need adjustment based on actual implementation
    await expect(page.locator('.dialer-panel')).toBeVisible({ timeout: 5000 });
  });

  test('FAB positioning and z-index', async ({ page }) => {
    const fab = page.getByTestId('dialer-fab');
    
    // Check that it's positioned fixed and in the bottom-right
    const styles = await fab.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return {
        position: computedStyle.position,
        bottom: computedStyle.bottom,
        right: computedStyle.right,
        zIndex: computedStyle.zIndex,
        pointerEvents: computedStyle.pointerEvents
      };
    });
    
    expect(styles.position).toBe('fixed');
    expect(styles.zIndex).toBe('9999');
    expect(styles.pointerEvents).toBe('auto');
  });

  test('Console logging on FAB click', async ({ page }) => {
    const consoleLogs: string[] = [];
    
    // Capture console logs
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });
    
    const fab = page.getByTestId('dialer-fab');
    await fab.click();
    
    // Check that our debug log appears
    expect(consoleLogs.some(log => log.includes('FAB clicked - opening dialer'))).toBe(true);
  });
});