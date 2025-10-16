import { test, expect } from '@playwright/test';
import { enableApiMocks } from '../utils/mocks';

const CONTACT_ID = process.env.CONTACT_ID || 'demo-contact-123';

test.describe('Contact Comms — UI Smoke (tabs + responsive)', () => {
  test.beforeEach(async ({ page }) => {
    await enableApiMocks(page, { contactId: CONTACT_ID });
    await page.goto(`/contacts/${CONTACT_ID}`);
    await expect(page.getByTestId('contact-details-3col')).toBeVisible();
  });

  test('tabs exist (desktop & mobile)', async ({ page }) => {
    // tab buttons (desktop) or bottom bar (mobile)
    await expect(page.getByTestId('tab-timeline')).toBeVisible();
    await expect(page.getByTestId('tab-sms')).toBeVisible();
    await expect(page.getByTestId('tab-calls')).toBeVisible();
    await expect(page.getByTestId('tab-email')).toBeVisible();
    await expect(page.getByTestId('tab-meetings')).toBeVisible();

    // mobile bottom nav visible on narrow screens (project handles this)
    // we just assert the element exists (will be hidden on desktop)
    await expect(page.getByTestId('mobile-bottom-tabs')).toHaveCount(1);
  });

  test('timeline renders and can filter', async ({ page }) => {
    await page.getByTestId('tab-timeline').click();
    await expect(page.getByTestId('filter-all')).toBeVisible();
    await page.getByTestId('filter-email').click();
    await page.getByTestId('filter-sms').click();
    await page.getByTestId('filter-call').click();
    await page.getByTestId('filter-meeting').click();
  });

  test('SMS panel renders and can send (mocked)', async ({ page }) => {
    await page.getByTestId('tab-sms').click();
    await expect(page.getByTestId('sms-to')).toBeVisible();
    await expect(page.getByTestId('sms-body')).toBeVisible();
    await page.getByTestId('sms-body').fill('Hello from E2E');
    await page.getByTestId('sms-send').click();
  });

  test('Calls panel renders and can start (mocked)', async ({ page }) => {
    await page.getByTestId('tab-calls').click();
    await expect(page.getByTestId('call-to')).toBeVisible();
    await page.getByTestId('call-to').fill('+15551234567');
    await page.getByTestId('call-start').click();
  });

  test('Email panel renders and shows interface', async ({ page }) => {
    await page.getByTestId('tab-email').click();
    // Check for email interface elements
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('Email History')).toBeVisible();
  });

  test('Meetings panel renders and can create (mocked)', async ({ page }) => {
    await page.getByTestId('tab-meetings').click();
    await expect(page.getByTestId('meeting-when')).toBeVisible();
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);
    await page.getByTestId('meeting-when').fill(futureDate);
    await page.getByTestId('meeting-duration').selectOption('30');
    await page.getByTestId('meeting-create').click();
  });
});