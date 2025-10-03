import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('SLF shell, tabs, and theme', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'SLF', exact: true }).click();
  await expect(page.getByText(/SLF MODE/i)).toBeVisible();
  for (const t of ['Dashboard','Pipeline','Contacts','Comms']) {
    await page.getByRole('link', { name: t, exact: true }).click();
    await expect(page.getByRole('link', { name: t, exact: true })).toHaveClass(/active/);
  }
});

test('SLF pipeline board is authorized and returns real data shape', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'SLF', exact: true }).click();
  await page.getByRole('link', { name: 'Pipeline', exact: true }).click();
  // Either cards render, or the explicit empty-state text appears per column
  const hasCards = await page.locator('.card', { hasText:/\$/ }).count();
  if (hasCards === 0) {
    // We show explicit "No applications in <Stage>" messages — check one is visible
    await expect(page.getByText(/No applications in/i).first()).toBeVisible();
  }
  // Never show mock content
  await expect(page.getByText(/Mock Co/i)).toHaveCount(0);
});