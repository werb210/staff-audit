import { Page, expect, APIRequestContext, request } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('/#/login');
  await page.getByLabel(/email/i).fill(process.env.STAFF_USER || 'todd.w@boreal.financial');
  await page.getByLabel(/password/i).fill(process.env.STAFF_PASS || 'password123');
  await page.getByRole('button', { name: /log ?in/i }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
}

export async function openTab(page: Page, label: string) {
  await page.getByRole('link', { name: label, exact: true }).click();
  await expect(page.getByRole('link', { name: label, exact: true })).toHaveClass(/active/);
}

export async function api(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: process.env.BASE_URL || 'http://localhost:5000' });
}