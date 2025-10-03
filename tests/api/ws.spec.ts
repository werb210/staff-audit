import { test, expect } from "@playwright/test";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const path = process.env.WS_PATH || "/ws";

test("socket.io polling handshake works", async ({ request }) => {
  const u = `${BASE}${path}/?EIO=4&transport=polling&t=${Date.now()}`;
  const r = await request.get(u);
  expect(r.status()).toBe(200);
});