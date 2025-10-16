import { test, expect, request } from '@playwright/test';

const BASE = process.env.STAFF_URL || 'http://127.0.0.1:5000';
const NODE_ENV = process.env.NODE_ENV || 'development';

function expectCookieAttrs(setCookieHeader: string) {
  if (NODE_ENV === 'production') {
    expect(setCookieHeader).toContain('__Host-bf_auth=');
    expect(setCookieHeader.toLowerCase()).toContain('secure');
    expect(setCookieHeader.toLowerCase()).toContain('httponly');
    expect(setCookieHeader).toMatch(/;\s*SameSite=None/i);
    expect(setCookieHeader).toMatch(/;\s*Path=\//i);
  } else {
    expect(setCookieHeader).toMatch(/(^|;\s*)bf_auth_enhanced=/);
    expect(setCookieHeader.toLowerCase()).toContain('httponly');
    expect(setCookieHeader).toMatch(/;\s*SameSite=Lax/i);
    expect(setCookieHeader).toMatch(/;\s*Path=\//i);
  }
}

test('login sets correct cookie policy for env and /me works via header fallback', async () => {
  const ctx = await request.newContext();

  // 1) Login
  const login = await ctx.post(`${BASE}/api/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email: 'john.smith@example.com', password: 'pw', otp: '123456' },
  });
  expect(login.status()).toBe(200);

  // Verify Set-Cookie header attributes
  const setCookie = login.headers()['set-cookie'];
  expect(setCookie).toBeTruthy();
  expectCookieAttrs(Array.isArray(setCookie) ? setCookie.join('; ') : setCookie);

  const body = await login.json();
  expect(body.ok).toBeTruthy();
  expect(body.token).toBeTruthy();

  // 2) /me via Authorization header fallback
  const me = await ctx.get(`${BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${body.token}` },
  });
  expect(me.status()).toBe(200);
  const meJson = await me.json();
  expect(meJson.ok).toBeTruthy();
  expect(meJson.user?.email).toBe('john.smith@example.com');
});