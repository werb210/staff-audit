import { test, expect, request } from "@playwright/test";
import { devLogin } from "./utils";

test("admin can impersonate; marketing can access contacts; admin endpoints work", async () => {
  const api = await request.newContext({ baseURL: "http://localhost:5000", extraHTTPHeaders: { Host: "bf.local" } });
  await devLogin(api);

  // Admin-only endpoint OK
  const imp = await api.post("/api/admin/impersonate", { data: { role: "marketing" } });
  expect(imp.status()).toBe(200);

  // Marketing allowed endpoint (contacts accessible to marketing role)
  const contacts = await api.get("/api/contacts/demo-contact");
  expect(contacts.status()).toBe(200);

  // Admin-only endpoint should still work because real role is admin
  const adminOnly = await api.post("/api/admin/impersonate", { data: { role: "agent" } });
  expect(adminOnly.status()).toBe(200); // Admin can still access admin endpoints
});

// COMPLIANCE: Additional RBAC tests
test('lender cannot edit other lenders products', async ({ request }) => {
  const api = await request.newContext({ baseURL: "http://localhost:5000" });
  const resp = await api.patch('/api/lender-products/prod_abc', {
    headers: { authorization: 'Bearer test' },
    data: { lenderId: 'L1', name: 'Changed' }
  });
  expect(resp.status()).toBe(403);
});

test('bearer token enforcement on all API calls', async ({ request }) => {
  const api = await request.newContext({ baseURL: "http://localhost:5000" });
  
  // Test all compliance endpoints require Bearer token
  const endpoints = [
    '/api/comm/email',
    '/api/tasks', 
    '/api/calendar',
    '/api/reports/velocity',
    '/api/marketing/overview'
  ];
  
  for (const endpoint of endpoints) {
    const resp = await api.get(endpoint);
    expect(resp.status()).toBe(401); // Should require auth
  }
});