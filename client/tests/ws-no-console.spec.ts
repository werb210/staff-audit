import { test, expect } from '@playwright/test';

test('no WS auth errors in console', async ({ page }) => {
  const errors: string[] = [];
  
  // Capture console errors
  page.on('console', m => { 
    if (m.type() === 'error') {
      errors.push(m.text()); 
    }
  });

  // Navigate to the staff pipeline page
  await page.goto('/staff/pipeline');
  
  // Wait for WebSocket connections and any async operations to complete
  await page.waitForTimeout(1500);
  
  // Check that no WebSocket authentication errors occurred
  const errorText = errors.join('\n');
  expect(errorText).not.toMatch(/websocket|WS|Unauthorized WebSocket/i);
});