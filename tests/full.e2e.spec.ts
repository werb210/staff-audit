import { test, expect } from '@playwright/test';
import { login, openTab } from './helpers';

const STAGES = ['New','In Review','Requires Documents','Off to Lender','Accepted','Denied'];

test.describe('Staff Portal — Full Feature Pass', () => {
  test('Dashboard + Nav smoke', async ({ page }) => {
    await login(page);
    for (const tab of ['Dashboard','Sales Pipeline','Contacts','Communication Center','Calendar & Tasks','Settings']) {
      await openTab(page, tab);
    }
  });

  test('Pipeline board → open card → tabs → docs → lenders', async ({ page }) => {
    await login(page);
    await openTab(page, 'Sales Pipeline');
    for (const col of STAGES) await expect(page.getByRole('heading', { name: col })).toBeVisible();
    const card = page.getByTestId('pipeline-card').first();
    if (await card.count() === 0) test.skip(true, 'No cards available');
    await card.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    for (const t of ['Application','Banking Analysis','Financial Data','Documents','Lenders']) {
      await page.getByRole('tab', { name: t }).click();
      await expect(page.getByRole('tab', { name: t })).toHaveAttribute('aria-selected', 'true');
    }
    // Docs tab actions (gracefully skip if no rows)
    await page.getByRole('tab', { name: 'Documents' }).click();
    const accept = page.getByTestId('doc-accept').first();
    if (await accept.count()) await accept.click();
    const reject = page.getByTestId('doc-reject').first();
    if (await reject.count()) await reject.click();
    // Lenders tab
    await page.getByRole('tab', { name: 'Lenders' }).click();
    const sendPkg = page.getByTestId('send-package').first();
    if (await sendPkg.count()) await sendPkg.click();
  });

  test('Comms — SMS, Calls, Email basic actions', async ({ page }) => {
    await login(page);
    await openTab(page, 'Communication Center');
    // SMS
    await page.getByRole('link', { name: 'SMS (Twilio)' }).click();
    const smsInput = page.getByTestId('sms-input');
    if (await smsInput.count()) {
      await smsInput.fill('E2E test message');
      await page.getByTestId('sms-send').click();
    }
    // Calls
    await page.getByRole('link', { name: 'Calls (Twilio)' }).click();
    // Email
    await page.getByRole('link', { name: 'Email (Office 365)' }).click();
    const send = page.getByTestId('email-send');
    if (await send.count()) {
      await page.getByLabel(/to/i).fill('qa@example.com');
      await page.getByLabel(/subject/i).fill('QA Playwright');
      await page.getByLabel(/body/i).fill('Automated QA email');
      await send.click();
    }
  });

  test('Marketing — templates, audience, campaigns', async ({ page }) => {
    await login(page);
    const marketing = page.getByRole('link', { name: 'Marketing', exact: true });
    if (!(await marketing.count())) test.skip(true, 'Marketing hidden for this role');
    await marketing.click();
    await page.getByRole('link', { name: 'Templates' }).click();
    await page.getByRole('link', { name: 'Audience' }).click();
    await page.getByRole('link', { name: 'Campaigns' }).click();
    const mkSendNow = page.getByTestId('mk-send-now').first();
    if (await mkSendNow.count()) await mkSendNow.click();
  });

  test('Support Issues — list and update', async ({ page }) => {
    await login(page);
    await page.goto('/#/portal/support');
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.count()) {
      await firstRow.click();
      await expect(page.getByRole('heading', { name: /screenshot/i })).toBeVisible();
      const save = page.getByTestId('support-save');
      if (await save.count()) await save.click();
    }
  });

  test('SLF — shell, pipeline, contacts, comms', async ({ page }) => {
    await login(page);
    const slf = page.getByRole('link', { name: 'SLF', exact: true });
    if (await slf.count() === 0) test.skip(true, 'SLF not enabled for this user');
    await slf.click();
    await expect(page.getByText(/SLF MODE/i)).toBeVisible();
    // Pipeline
    await page.getByRole('link', { name: 'Pipeline', exact: true }).click();
    const card = page.getByTestId('pipeline-card').first();
    if (await card.count()) { await card.click(); await expect(page.getByRole('dialog')).toBeVisible(); }
    // Contacts
    await page.getByRole('link', { name: 'Contacts', exact: true }).click();
    // Comms
    await page.getByRole('link', { name: 'Comms', exact: true }).click();
  });

  test('Logout', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/login/i);
  });
});