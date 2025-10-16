import { test, expect } from "@playwright/test";
const API = process.env.STAFF_API_BASE || "http://localhost:5000";

test("email: internal test endpoint", async ({ request }) => {
  const r = await request.post(`${API}/api/_int/email/test`, {
    data: { to: "you@yourdomain.com" }
  });
  expect(r.ok()).toBeTruthy();
  const j = await r.json();
  expect(j.ok).toBeTruthy();
});