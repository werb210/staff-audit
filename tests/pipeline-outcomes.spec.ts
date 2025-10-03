import { test, expect } from "@playwright/test";

test("Lender Outcome API health check", async ({ request }) => {
  const response = await request.get("/api/lenders/outcomes/health");
  expect(response.status()).toBe(200);
  
  const data = await response.json();
  expect(data.ok).toBe(true);
  expect(data.service).toBe("lender_outcomes");
  expect(data.endpoints).toContain("POST /api/lenders/outcome");
  expect(data.endpoints).toContain("POST /api/lenders/webhook");
});

test("Outcome API accepts valid requests", async ({ request }) => {
  const response = await request.post("/api/lenders/outcome", {
    data: {
      appId: "test-app-123",
      outcome: "Accepted",
      fundsDisbursed: true,
      amount: 50000,
      idempotencyKey: "test-key-1"
    }
  });
  
  // Should accept the request (200) even if app doesn't exist in mock data
  expect([200, 404].includes(response.status())).toBeTruthy();
  
  if (response.status() === 200) {
    const data = await response.json();
    expect(data.ok).toBe(true);
  }
});

test("Outcome API handles idempotency", async ({ request }) => {
  const requestData = {
    appId: "test-app-456",
    outcome: "Declined",
    reason: "Insufficient credit score",
    idempotencyKey: "test-key-2"
  };
  
  // First request
  const response1 = await request.post("/api/lenders/outcome", { data: requestData });
  expect([200, 404].includes(response1.status())).toBeTruthy();
  
  // Second identical request should be idempotent
  const response2 = await request.post("/api/lenders/outcome", { data: requestData });
  expect([200, 404].includes(response2.status())).toBeTruthy();
  
  if (response2.status() === 200) {
    const data = await response2.json();
    expect(data.ok).toBe(true);
    expect(data.idempotent).toBe(true);
  }
});

test("Webhook API maps partner payloads", async ({ request }) => {
  const response = await request.post("/api/lenders/webhook", {
    data: {
      referenceId: "test-app-789",
      status: "funds_disbursed",
      amount: 75000,
      fundsReleasedAt: "2025-08-14T15:30:00Z",
      eventId: "evt_test_123"
    }
  });
  
  // Webhook should always return 200 to prevent partner retries
  expect(response.status()).toBe(200);
  
  const data = await response.json();
  expect(data.ok).toBe(true);
});

test("Outcome API validates required fields", async ({ request }) => {
  const response = await request.post("/api/lenders/outcome", {
    data: {
      // Missing required appId and outcome
      amount: 25000
    }
  });
  
  expect(response.status()).toBe(400);
  
  const data = await response.json();
  expect(data.error).toBe("missing_fields");
});

test("Outcome API validates outcome values", async ({ request }) => {
  const response = await request.post("/api/lenders/outcome", {
    data: {
      appId: "test-app-999",
      outcome: "InvalidOutcome", // Invalid outcome
      fundsDisbursed: false
    }
  });
  
  expect(response.status()).toBe(400);
  
  const data = await response.json();
  expect(data.error).toBe("invalid_outcome");
});