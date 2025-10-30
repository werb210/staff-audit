import { test, expect } from '@playwright/test';
test('contacts drawer: note + task + status chips', async ({ page }) => {
    await page.goto('/staff/contacts');
    // Wait for contacts to load
    await page.waitForSelector('[data-testid="card-grid"]', { timeout: 10000 });
    // Open first contact card
    const firstCard = page.locator('[data-testid="card-grid"] .card, [data-testid="card-grid"] [data-test-card]').first();
    await firstCard.click();
    // Check for carrier badge (if phone number exists)
    await expect(page.locator('[data-test="carrier-badge"]')).toBeVisible({ timeout: 5000 });
    // Create a task via button click
    await page.getByRole('button', { name: /task/i }).click();
    await expect(page.locator('[data-test="timeline-item"]')).toContainText('task');
    // Create a note via button click  
    await page.getByRole('button', { name: /note/i }).click();
    await expect(page.locator('[data-test="timeline-item"]')).toContainText('note');
    // Send SMS → status chip moves
    await page.getByRole('button', { name: /sms/i }).click();
    await expect(page.locator('[data-test="sms-status"]')).toHaveText(/queued|delivered|idle/);
    // Send Email → status chip moves
    await page.getByRole('button', { name: /email/i }).click();
    await expect(page.locator('[data-test="email-status"]')).toHaveText(/queued|opened|idle/);
});
