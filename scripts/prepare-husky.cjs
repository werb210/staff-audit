#!/usr/bin/env node
if (process.env.CI === '1' || process.env.NODE_ENV === 'production' || process.env.HUSKY === '0') {
  console.log('[husky] skipped in CI/production');
  process.exit(0);
}
try {
  require('husky').install();
} catch (e) {
  console.log('[husky] not installed; continuing');
}
