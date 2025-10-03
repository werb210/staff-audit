import { APIRequestContext, request, expect } from "@playwright/test";

export async function newAPI(baseURL = "http://localhost:5000") {
  return await request.newContext({ baseURL });
}

export async function devLogin(api: APIRequestContext, email="staff@boreal.financial") {
  const r = await api.post("/api/auth/dev-login", { data: { email } });
  expect(r.status()).toBe(200);
  // Persist auth cookies in this context
  return api;
}

export async function authHeaderFromCookie(api: APIRequestContext) {
  // Ask /api/auth/me to ensure cookie is valid and to simulate bearer later if needed
  const me = await api.get("/api/auth/me");
  expect(me.status()).toBe(200);
  // If you also support Bearer, return a token here if /dev-login returns it in body; otherwise skip.
  return null;
}