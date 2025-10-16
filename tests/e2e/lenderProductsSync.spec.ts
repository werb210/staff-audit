import { test, expect } from "@playwright/test";
import fs from "fs";

const STAFF_API_URL = process.env.STAFF_API_URL || "https://staff.boreal.financial";
const CLIENT_API_URL = process.env.CLIENT_API_URL || "https://clientportal.boreal.financial";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "dev-admin-key";

// Utility: read client cache
const getClientCache = () => {
  const filePath = "../client-app/data/lenderProducts.json";
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

test.describe("Lender Products Handoff E2E", () => {
  let productId: string;

  test("Step 1 → Staff API health check", async ({ request }) => {
    const res = await request.get(`${STAFF_API_URL}/api/client/lender-products`);
    expect(res.status()).toBe(200);
    const products = await res.json();
    expect(Array.isArray(products)).toBeTruthy();
  });

  test("Step 2 → Create test product in Staff App", async ({ request }) => {
    const res = await request.post(`${STAFF_API_URL}/api/client/lender-products`, {
      headers: {
        "Authorization": `Bearer ${ADMIN_KEY}`,
        "Content-Type": "application/json"
      },
      data: {
        name: "🔥 E2E Sync Test 🔥",
        category: "Working Capital",
        country: "Canada",
        minAmount: 50000,
        maxAmount: 200000,
        requiredDocuments: ["bank_statements", "tax_returns"]
      }
    });
    expect(res.status()).toBe(201);
    const json = await res.json();
    productId = json.id;
  });

  test("Step 3 → Verify webhook → client cache updated", async () => {
    // Wait a little for webhook delivery
    await new Promise(resolve => setTimeout(resolve, 3000));
    const cache = getClientCache();
    const found = cache.find((p: any) => p.name === "🔥 E2E Sync Test 🔥");
    expect(found).toBeTruthy();
    expect(found.requiredDocuments).toContain("bank_statements");
  });

  test("Step 4 → Verify client fetches updated list", async ({ request }) => {
    const res = await request.get(`${CLIENT_API_URL}/data/lenderProducts.json`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    const found = json.find((p: any) => p.name === "🔥 E2E Sync Test 🔥");
    expect(found).toBeTruthy();
  });

  test("Step 5 → Cleanup test product", async ({ request }) => {
    const res = await request.delete(`${STAFF_API_URL}/api/client/lender-products/${productId}`, {
      headers: { "Authorization": `Bearer ${ADMIN_KEY}` }
    });
    expect(res.status()).toBe(204);
  });
});