import { Page, Request } from '@playwright/test';

const ALLOWED = [
  /^\/api\/pipeline/i,
  /^\/api\/lenders/i,
  /^\/api\/lender-products/i,
  /^\/api\/contacts/i,
  /^\/api\/comm\//i,
  /^\/api\/tasks/i,
  /^\/api\/calendar/i,
  /^\/api\/reports/i,
  /^\/api\/marketing\//i,
  /^\/api\/auth\//i,
];

export async function assertOnlyApprovedNamespaces(page: Page) {
  page.on('request', (req: Request) => {
    const url = new URL(req.url());
    if (url.origin !== page.url().split(url.pathname)[0]) return; // ignore 3rd-party
    const p = url.pathname;
    const ok = ALLOWED.some(rx => rx.test(p)) || /\.(js|css|png|svg|ico|map)$/.test(p);
    if (!ok) throw new Error(`❌ DISALLOWED REQUEST: ${p}`);
  });
}