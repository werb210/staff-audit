import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server/index";

describe("Public Lender API", () => {
  it("returns 200 + JSON array with id + product_name", async () => {
    const res = await request(app).get("/api/public/lenders");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);

    const body = res.body;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    // quick schema sanity-check on first record
    const first = body[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("productName");
    expect(first).toHaveProperty("lenderName");
    expect(first).toHaveProperty("productType");
    expect(first).toHaveProperty("minAmount");
    expect(first).toHaveProperty("maxAmount");
  });

  it("returns category summary with proper structure", async () => {
    const res = await request(app).get("/api/public/lenders/summary");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);

    const body = res.body;
    expect(body).toHaveProperty("categories");
    expect(Array.isArray(body.categories)).toBe(true);

    if (body.categories.length > 0) {
      const category = body.categories[0];
      expect(category).toHaveProperty("productType");
      expect(category).toHaveProperty("count");
      expect(typeof category.count).toBe("number");
    }
  });

  it("handles CORS headers correctly", async () => {
    const res = await request(app)
      .get("/api/public/lenders")
      .set("Origin", "https://clientportal.replit.app");
    
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeDefined();
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("authenticated lender products endpoint requires auth", async () => {
    const res = await request(app).get("/api/lender-products");
    expect(res.status).toBe(401);
  });

  it("can create lender product with proper authentication", async () => {
    // First login to get auth token
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@boreal.com",
        password: process.env.ADMIN_PASSWORD || 'admin123'
      });

    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers["set-cookie"];

    // Create a test lender product
    const createRes = await request(app)
      .post("/api/lender")
      .set("Cookie", cookies)
      .send({
        lenderName: "Test Lender Inc",
        productName: "Business Growth Loan",
        productType: "working_capital",
        minAmount: 50000,
        maxAmount: 1000000,
        geography: ["US"],
        description: "Flexible working capital for business growth"
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.product).toHaveProperty("id");
    expect(createRes.body.product.productName).toBe("Business Growth Loan");
  });

  it("can update lender product with PATCH", async () => {
    // Login first
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@boreal.com",
        password: process.env.ADMIN_PASSWORD || 'admin123'
      });

    const cookies = loginRes.headers["set-cookie"];

    // Create a product to update
    const createRes = await request(app)
      .post("/api/lender")
      .set("Cookie", cookies)
      .send({
        lenderName: "Update Test Lender",
        productName: "Initial Product Name",
        productType: "term_loan",
        minAmount: 25000,
        maxAmount: 500000,
        geography: ["US"],
        description: "Initial description"
      });

    const productId = createRes.body.product.id;

    // Update the product
    const updateRes = await request(app)
      .patch(`/api/lender/${productId}`)
      .set("Cookie", cookies)
      .send({
        productName: "Updated Product Name",
        maxAmount: 750000,
        description: "Updated description with new terms"
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.product.productName).toBe("Updated Product Name");
    expect(updateRes.body.product.maxAmount).toBe("750000.00");
  });

  it("can soft delete lender product", async () => {
    // Login first
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@boreal.com",
        password: process.env.ADMIN_PASSWORD || 'admin123'
      });

    const cookies = loginRes.headers["set-cookie"];

    // Create a product to delete
    const createRes = await request(app)
      .post("/api/lender")
      .set("Cookie", cookies)
      .send({
        lenderName: "Delete Test Lender",
        productName: "Product to Delete",
        productType: "line_of_credit",
        minAmount: 10000,
        maxAmount: 100000,
        geography: ["US"],
        description: "This will be deleted"
      });

    const productId = createRes.body.product.id;

    // Delete the product
    const deleteRes = await request(app)
      .delete(`/api/lender/${productId}`)
      .set("Cookie", cookies);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.message).toContain("deactivated");
  });
});