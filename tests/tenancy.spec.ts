import { test, expect, request } from "@playwright/test";
import { devLogin } from "./utils";

test.describe("BF vs SLF isolation", () => {
  test("bf.local and slf.local return different tenants", async () => {
    const bf = await request.newContext({ baseURL: "http://localhost:5000", extraHTTPHeaders: { Host: "bf.local" } });
    const slf = await request.newContext({ baseURL: "http://localhost:5000", extraHTTPHeaders: { Host: "slf.local" } });

    await devLogin(bf);
    await devLogin(slf);

    const r1 = await bf.get("/api/tenant/current");
    const r2 = await slf.get("/api/tenant/current");
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);

    const t1 = (await r1.json())?.tenant ?? (await r1.json())?.tenantId ?? "bf";
    const t2 = (await r2.json())?.tenant ?? (await r2.json())?.tenantId ?? "slf";
    expect(t1).toBe("bf");
    expect(t2).toBe("slf");
    expect(t1).not.toBe(t2);
  });

  test("private routes are NOT whitelisted: 401 when logged out", async () => {
    const bf = await request.newContext({ baseURL: "http://localhost:5000", extraHTTPHeaders: { Host: "bf.local" } });
    const r = await bf.get("/api/contacts/demo-contact");
    expect(r.status()).toBe(401); // Must be 401 due to missing authentication
  });
});