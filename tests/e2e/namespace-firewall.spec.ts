import { test } from '@playwright/test';
import { assertOnlyApprovedNamespaces } from './utils/allowedNamespaces';

test('only approved API namespaces are used across key pages', async ({ page }) => {
  await assertOnlyApprovedNamespaces(page);
  for (const path of ['/staff/lenders','/staff/lender-products','/staff/contacts','/staff/pipeline']) {
    await page.goto(path);
  }
});