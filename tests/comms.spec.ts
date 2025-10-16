import { test, expect } from '@playwright/test';
import { login, openTab } from './helpers';

test('Comms: SMS, Calls, Email tabs render', async ({ page }) => {
  await login(page);
  await openTab(page, 'Communication Center');
  for (const t of ['SMS (Twilio)','Calls (Twilio)','Email (Office 365)']) {
    await page.getByRole('link', { name: t }).click();
    await expect(page.getByRole('link', { name: t })).toHaveClass(/active/);
  }
});