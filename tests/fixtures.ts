import { test as base } from '@playwright/test';

const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (['error'].includes(msg.type())) errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(String(err)));
    await use(page);
    if (errors.length) {
      throw new Error('Console errors detected:\n' + errors.join('\n'));
    }
  },
});

export { test };