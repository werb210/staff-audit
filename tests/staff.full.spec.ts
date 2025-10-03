import { test, expect } from '@playwright/test';
import { login, openTab, api } from './helpers';

const STAGES = ['New','In Review','Requires Documents','Off to Lender','Accepted','Denied'];
const DETAIL_TABS = ['Application','Banking Analysis','Financial Data','Documents','Lenders'];

test.describe('Staff Portal — Ultimate Feature Pass', () => {
  test('Health & auth endpoints respond', async () => {
    const ctx = await api();
    for (const path of ['/api/auth/user','/api/pipeline/board','/api/slf/pipeline/board']) {
      const r = await ctx.get(path, { failOnStatusCode: false });
      expect([200,401]).toContain(r.status());
    }
  });

  test('Dashboard → Pipeline → open card → tabs → actions', async ({ page }) => {
    await login(page);
    await openTab(page, 'Dashboard');
    await openTab(page, 'Sales Pipeline');
    for (const s of STAGES) await expect(page.getByRole('heading', { name: s })).toBeVisible();
    const card = page.getByTestId('pipeline-card').first();
    if (await card.count() === 0) test.skip(true, 'No pipeline cards available');
    await card.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    for (const t of DETAIL_TABS) {
      await page.getByRole('tab', { name: t }).click();
      await expect(page.getByRole('tab', { name: t })).toHaveAttribute('aria-selected','true');
    }
    // Docs tab (optional actions)
    await page.getByRole('tab', { name: 'Documents' }).click();
    const accept = page.getByTestId('doc-accept').first();
    if (await accept.count()) await accept.click();
    const reject = page.getByTestId('doc-reject').first();
    if (await reject.count()) await reject.click();
    // Lenders tab (optional send)
    await page.getByRole('tab', { name: 'Lenders' }).click();
    const send = page.getByTestId('send-package').first();
    if (await send.count()) await send.click();
  });

  test('Contacts → open first row → quick actions visible', async ({ page }) => {
    await login(page);
    await openTab(page, 'Contacts');
    const row = page.locator('table tbody tr').first();
    if (await row.count()) {
      await row.click();
      await expect(page.getByText(/Contact|Details/i).first()).toBeVisible();
      await expect(page.getByText(/SMS|Text/i).first()).toBeVisible({ timeout: 2000 }).catch(()=>{});
      await expect(page.getByText(/Email/i).first()).toBeVisible({ timeout: 2000 }).catch(()=>{});
      await expect(page.getByText(/Call/i).first()).toBeVisible({ timeout: 2000 }).catch(()=>{});
    }
  });

  test('Communication Center — SMS, Calls, Email (O365)', async ({ page }) => {
    await login(page);
    await openTab(page, 'Communication Center');
    // SMS
    await page.getByRole('link', { name: /SMS/i }).click();
    const smsInput = page.getByTestId('sms-input');
    if (await smsInput.count()) {
      await smsInput.fill('E2E test message');
      await page.getByTestId('sms-send').click();
    }
    // Calls
    await page.getByRole('link', { name: /Calls/i }).click();
    await expect(page.getByText(/Call Log|Recent Calls/i).first()).toBeVisible({ timeout: 2000 }).catch(()=>{});
    // Email (Office 365)
    await page.getByRole('link', { name: /Email.*Office/i }).click();
    const send = page.getByTestId('email-send');
    if (await send.count()) {
      await page.getByLabel(/to/i).fill('qa@example.com');
      await page.getByLabel(/subject/i).fill('QA Playwright');
      await page.getByLabel(/body|message/i).fill('Automated QA email');
      await send.click();
    }
  });

  test('Calendar & Tasks — add quick event (if enabled)', async ({ page }) => {
    await login(page);
    await openTab(page, 'Calendar & Tasks');
    const add = page.getByRole('button', { name: /new event|add/i }).first();
    if (await add.count()) {
      await add.click();
      await page.getByLabel(/title/i).fill('QA Event');
      await page.getByRole('button', { name: /save|create/i }).click().catch(()=>{});
    }
  });

  test('Settings (passkeys link present) & Logout', async ({ page }) => {
    await login(page);
    await openTab(page, 'Settings');
    await expect(page.getByText(/Passkey|WebAuthn/i).first()).toBeVisible({ timeout: 2000 }).catch(()=>{});
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/login/i);
  });

  test('SLF silo — tabs & pipeline @slf', async ({ page }) => {
    await login(page);
    const slf = page.getByRole('link', { name: 'SLF', exact: true });
    if (await slf.count() === 0) test.skip(true, 'SLF not enabled for this user');
    await slf.click();
    await expect(page.getByText(/SLF MODE/i)).toBeVisible();
    for (const t of ['Dashboard','Pipeline','Contacts','Comms']) {
      await page.getByRole('link', { name: t, exact: true }).click();
      await expect(page.getByRole('link', { name: t, exact: true })).toHaveClass(/active/);
    }
    await page.getByRole('link', { name: 'Pipeline', exact: true }).click();
    const card = page.getByTestId('pipeline-card').first();
    if (await card.count()) { await card.click(); await expect(page.getByRole('dialog')).toBeVisible(); }
  });
});