import { test, expect } from '@playwright/test';

const E = [
  { url: '/api/user-management',         expectArray: true  },
  { url: '/api/roles',                   expectArray: true  },
  { url: '/api/integrations',            expectArray: true  },
  { url: '/api/settings/company',        expectArray: false },
  { url: '/api/settings/preferences',    expectArray: false },
  { url: '/api/notifications/templates', expectArray: true  },
  { url: '/api/analytics/summary',       expectArray: false },
  { url: '/api/performance/metrics',     expectArray: false },
  { url: '/api/diagnostics/summary',     expectArray: false },
];

test.describe('Settings API – coarse contracts', () => {
  for (const e of E) {
    test(`GET ${e.url}`, async ({ request }) => {
      const res = await request.get(e.url);
      // Allow 2xx/3xx/4xx during unconfigured states; just not server 5xx
      expect(res.status(), e.url).toBeLessThan(500);
      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // allow empty/no-json endpoints if 204 etc.
        return;
      }
      if (e.expectArray) expect(Array.isArray(body), `${e.url} should return an array`).toBe(true);
      else expect(typeof body, `${e.url} should return an object`).toBe('object');
    });
  }
});