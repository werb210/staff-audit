import { test, expect } from "@playwright/test";
const API = process.env.STAFF_API_BASE || "http://localhost:5000";

test("ai: ad suggestions return JSON object", async ({ request }) => {
  const r = await request.post(`${API}/api/ai/ad-suggestions`, {
    data: { industry:"construction", goals:"lead gen", budget:5000 }
  });
  expect(r.ok()).toBeTruthy();
  const j = await r.json();
  expect(typeof j).toBe("object");
});