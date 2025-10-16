import { test, expect } from '@playwright/test';
import { enableApiMocks } from '../utils/mocks';

const CONTACT_ID = process.env.CONTACT_ID || 'demo-contact-123';

test.describe('Contact Comms — Integration (mock/live toggle)', () => {
  test.beforeEach(async ({ page }) => {
    await enableApiMocks(page, { contactId: CONTACT_ID });
    await page.goto(`/contacts/${CONTACT_ID}`);
    await expect(page.getByTestId('contact-details-3col')).toBeVisible();
  });

  test('SMS send posts correct body', async ({ page }) => {
    let captured = '';
    if (process.env.SKIP_MOCK === '1') {
      // live mode: only UI flow
      await page.getByTestId('tab-sms').click();
      await page.getByTestId('sms-to').fill('+15551230000');
      await page.getByTestId('sms-body').fill('Live hello');
      await page.getByTestId('sms-send').click();
      return;
    }
    await page.route('**/api/contacts/*/sms', async (route) => {
      if (route.request().method() === 'POST') captured = route.request().postData() || '';
      await route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' });
    });
    await page.getByTestId('tab-sms').click();
    await page.getByTestId('sms-to').fill('+15551230000');
    await page.getByTestId('sms-body').fill('Hello world');
    await page.getByTestId('sms-send').click();
    expect(captured).toContain('Hello world');
  });

  test('Call start posts to calls endpoint', async ({ page }) => {
    let seen = false;
    if (process.env.SKIP_MOCK === '1') {
      await page.getByTestId('tab-calls').click();
      await page.getByTestId('call-to').fill('+15551234567');
      await page.getByTestId('call-start').click();
      return;
    }
    await page.route('**/api/contacts/*/calls', async (route) => {
      if (route.request().method() === 'POST') seen = true;
      await route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' });
    });
    await page.getByTestId('tab-calls').click();
    await page.getByTestId('call-to').fill('+15551234567');
    await page.getByTestId('call-start').click();
    expect(seen).toBeTruthy();
  });

  test('Email list fetches and renders', async ({ page }) => {
    await page.getByTestId('tab-email').click();
    await expect(page.getByText('Email History')).toBeVisible();
  });

  test('Meeting create posts to meetings endpoint', async ({ page }) => {
    let posted = false;
    if (process.env.SKIP_MOCK === '1') {
      await page.getByTestId('tab-meetings').click();
      const futureDate = new Date(Date.now() + 3600000).toISOString().slice(0, 16);
      await page.getByTestId('meeting-when').fill(futureDate);
      await page.getByTestId('meeting-duration').selectOption('30');
      await page.getByTestId('meeting-create').click();
      return;
    }
    await page.route('**/api/contacts/*/meetings', async (route) => {
      if (route.request().method() === 'POST') posted = true;
      await route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' });
    });
    await page.getByTestId('tab-meetings').click();
    const futureDate = new Date(Date.now() + 3600000).toISOString().slice(0, 16);
    await page.getByTestId('meeting-when').fill(futureDate);
    await page.getByTestId('meeting-duration').selectOption('45');
    await page.getByTestId('meeting-create').click();
    expect(posted).toBeTruthy();
  });

  test('Booking link can be sent', async ({ page }) => {
    let captured = false;
    if (process.env.SKIP_MOCK === '1') {
      await page.getByTestId('tab-meetings').click();
      await page.getByTestId('booking-link-to').fill('test@example.com');
      await page.getByTestId('booking-link-send').click();
      return;
    }
    await page.route('**/api/contacts/*/send-booking-link', async (route) => {
      if (route.request().method() === 'POST') captured = true;
      await route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true,"sent":true}' });
    });
    await page.getByTestId('tab-meetings').click();
    await page.getByTestId('booking-link-to').fill('test@example.com');
    await page.getByTestId('booking-link-send').click();
    expect(captured).toBeTruthy();
  });
});