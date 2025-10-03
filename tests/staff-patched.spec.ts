import { test, expect } from '@playwright/test';

test.use({ storageState: 'auth.json' });

const BASE = process.env.BASE_URL!;

test('Auth & Navigation Sanity', async ({ page }) => {
  await page.goto(BASE + '/portal');
  const modules = [
    'Pipeline', 'Contacts', 'Documents', 'Communication', 'Reports',
    'AI Reports', 'Training Docs', 'Chat Management', 'Handoff Queue',
    'Lender Products', 'Lender Management', 'Tasks', 'Calendar', 'Marketing', 'Settings'
  ];
  for (const name of modules) {
    await page.getByRole('link', { name }).click();
    await expect(page.getByText(name, { exact: false })).toBeVisible();
  }
});

test('Sales Pipeline Card Interactions', async ({ page }) => {
  await page.goto(BASE + '/pipeline');
  await page.waitForSelector('[data-testid="application-card"], .application-card', { timeout: 5000 });
  await page.locator('[data-testid="application-card"], .application-card').first().click();
  const tabs = ['Application', 'Banking', 'Financials', 'Documents', 'Lenders', 'OCR Insights'];
  for (const tab of tabs) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByText(tab, { exact: false })).toBeVisible();
  }
});

test('Document Tab Buttons', async ({ page }) => {
  await page.goto(BASE + '/pipeline');
  await page.locator('[data-testid="application-card"], .application-card').first().click();
  await page.getByRole('tab', { name: 'Documents' }).click();

  await page.waitForSelector('[data-testid="document-row"], .document-row', { timeout: 5000 });
  const docRow = page.locator('[data-testid="document-row"], .document-row').first();

  await docRow.getByRole('button', { name: /preview/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /close/i }).click();

  const [ download ] = await Promise.all([
    page.waitForEvent('download'),
    docRow.getByRole('button', { name: /download/i }).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/\.(pdf|png|jpg|docx|xlsx)$/i);

  await docRow.getByRole('button', { name: /accept/i }).click();
  await expect(page.getByText(/accepted/i)).toBeVisible();

  await docRow.getByRole('button', { name: /reject/i }).click();
  await expect(page.getByRole('dialog')).toContainText(/reason|category/i);
});

test('Communication Center Tabs', async ({ page }) => {
  await page.goto(BASE + '/communication');
  const tabs = ['SMS', 'Calls', 'Email', 'Templates'];
  for (const tab of tabs) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByText(tab, { exact: false })).toBeVisible();
  }
});

test('Reports Load', async ({ page }) => {
  await page.goto(BASE + '/reports');
  const charts = page.locator('canvas, svg');
  await expect(charts).toHaveCountGreaterThan(0);
});

test('OCR Insights Tab Functionality', async ({ page }) => {
  await page.goto(BASE + '/pipeline');
  await page.locator('[data-testid="application-card"], .application-card').first().click();
  await page.getByRole('tab', { name: 'OCR Insights' }).click();

  const docTypes = ['Balance Sheet Data', 'Income Statement', 'Cash Flow Statements', 'Taxes', 'Contracts', 'Invoices'];
  for (const type of docTypes) {
    await expect(page.getByText(type)).toBeVisible();
  }
});

test('Lender Recommendations Tab Functionality', async ({ page }) => {
  await page.goto(BASE + '/pipeline');
  await page.locator('[data-testid="application-card"], .application-card').first().click();
  await page.getByRole('tab', { name: 'Lenders' }).click();

  const lenderRows = page.locator('[data-testid="lender-row"], .lender-row');
  await expect(lenderRows).toHaveCountGreaterThan(0);
  await expect(lenderRows.first().locator('.likelihood-score')).toBeVisible();
});