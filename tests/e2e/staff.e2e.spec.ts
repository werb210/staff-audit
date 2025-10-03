import { test, expect } from "@playwright/test";

test.describe("Staff Application E2E Tests", () => {
  const API_BASE = process.env.VITE_API_URL || "https://staff.boreal.financial";
  const STAFF_TOKEN = process.env.VITE_STAFF_TOKEN;

  test("Lender Products API returns 32 items", async ({ request }) => {
    const res = await request.get(
      `${API_BASE}/api/lender-products`,
      {
        headers: {
          Authorization: `Bearer ${STAFF_TOKEN}`,
        },
      }
    );
    expect(res.status()).toBe(200);
    const products = await res.json();
    expect(products.length).toBe(32);

    // Schema validation for first product
    if (products.length > 0) {
      const firstProduct = products[0];
      expect(firstProduct).toHaveProperty("id");
      expect(firstProduct).toHaveProperty("lender_name");
      expect(firstProduct).toHaveProperty("product_name");
      expect(typeof firstProduct.id).toBe("string");
      expect(typeof firstProduct.lender_name).toBe("string");
      expect(typeof firstProduct.product_name).toBe("string");
    }
  });

  test("Applications API returns authenticated data", async ({ request }) => {
    const res = await request.get(
      `${API_BASE}/data/applications`,
      {
        headers: {
          Authorization: `Bearer ${STAFF_TOKEN}`,
        },
      }
    );
    expect(res.status()).toBe(200);
    const applications = await res.json();
    expect(Array.isArray(applications)).toBe(true);
    expect(applications.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Staff App - Create/Edit/Delete Users", () => {
  let createdUserId: string;

  test("creates a new user", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/users`, {
      headers: {
        Authorization: `Bearer ${CLIENT_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: {
        email: "testuser+e2e@boreal.financial",
        role: "STAFF",
        password: "TempPass123!",
      },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    createdUserId = body.id;
    expect(body).toHaveProperty("id");
    expect(body.email).toContain("testuser+e2e");
  });

  test("edits the created user", async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/users/${createdUserId}`, {
      headers: {
        Authorization: `Bearer ${CLIENT_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: {
        role: "ADMIN",
      },
    });

    expect(res.ok()).toBeTruthy();
    const updated = await res.json();
    expect(updated.role).toBe("ADMIN");
  });

  test("deletes the created user", async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/api/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
    });

    expect(res.ok()).toBeTruthy();
    const verify = await request.get(`${BASE_URL}/api/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
    });

    expect(verify.status()).toBe(404);
  });
});

test.describe("Staff App - Connected Accounts OAuth", () => {
  const providers = ["microsoft", "google", "linkedin"];

  for (const provider of providers) {
    test(`verifies OAuth URL available for ${provider}`, async ({ request }) => {
      const res = await request.get(`${BASE_URL}/api/oauth/${provider}/connect`, {
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
      });
      expect(res.ok()).toBeTruthy();
    });
  }
});

test.describe("Staff App - Schema Lock Validation", () => {
  test("ensures schema-lock.json matches DB", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/schema/hash`, {
      headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
    });

    expect(res.ok()).toBeTruthy();
    const { currentHash, lockedHash } = await res.json();
    expect(currentHash).toBe(lockedHash);
  });
});