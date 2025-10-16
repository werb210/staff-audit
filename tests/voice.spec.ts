import { test, expect, request } from "@playwright/test";

test("inbound voice webhook is public but not implemented (404 not 401)", async () => {
  const api = await request.newContext({ baseURL: "http://localhost:5000" });
  const r = await api.post("/api/voice/inbound", { form: { To: "+15550001111", From: "+15551230000", CallSid: "CA123" } });
  // Voice route is not currently implemented, but should not require auth (404 not 401)
  expect(r.status()).toBe(404);
});

test("health endpoint is public and working", async () => {
  const api = await request.newContext({ baseURL: "http://localhost:5000" });
  const r = await api.get("/api/health");
  expect(r.status()).toBe(200);
});