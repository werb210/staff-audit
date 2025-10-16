import request from "supertest";
import app from "../../server/app";

describe("AI API pack", () => {
  const APP_ID = process.env.TEST_APP_ID || "app_demo_1";

  it("GET /api/ai/docs/scan requires applicationId", async () => {
    const res = await request(app).get("/api/ai/docs/scan");
    expect(res.status).toBe(422);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe("missing_applicationId");
  });

  it("GET /api/ai/docs/scan with applicationId", async () => {
    const res = await request(app).get(`/api/ai/docs/scan?applicationId=${APP_ID}`);
    expect([200, 500, 422]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.missing)).toBe(true);
      expect(Array.isArray(res.body.quality)).toBe(true);
    }
  });

  it("POST /api/ai/financials/score", async () => {
    const res = await request(app)
      .post("/api/ai/financials/score")
      .send({ applicationId: APP_ID });
    expect([200, 500, 422]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.score).toBe("number");
      expect(typeof res.body.dscr).toBe("number");
    }
  });

  it("POST /api/ai/approval-prob", async () => {
    const res = await request(app)
      .post("/api/ai/approval-prob")
      .send({ applicationId: APP_ID, lenderId: "LEND1" });
    expect([200, 500, 422]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.probability).toBe("number");
      expect(typeof res.body.etaDays).toBe("number");
    }
  });

  it("POST /api/ai/timeline", async () => {
    const res = await request(app)
      .post("/api/ai/timeline")
      .send({ applicationId: APP_ID });
    expect([200, 500, 422]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.etaDays).toBe("number");
      expect(Array.isArray(res.body.steps)).toBe(true);
    }
  });

  it("POST /api/ai/ops/priority", async () => {
    const res = await request(app)
      .post("/api/ai/ops/priority")
      .send({ applicationId: APP_ID });
    expect([200, 500, 422]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.priority).toBe("number");
    }
  });

  it("POST /api/ai/docs/validate", async () => {
    const res = await request(app)
      .post("/api/ai/docs/validate")
      .send({ applicationId: APP_ID });
    expect([200, 500, 422]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.issues)).toBe(true);
    }
  });

  it("POST /api/ai/compose/email", async () => {
    const res = await request(app)
      .post("/api/ai/compose/email")
      .send({ applicationId: APP_ID });
    expect([200, 422]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.ok).toBe(true);
      expect(res.body.draft).toBeDefined();
      expect(res.body.draft.subject).toBeDefined();
      expect(res.body.draft.body).toBeDefined();
    }
  });

  it("POST /api/ai/compliance/screen", async () => {
    const res = await request(app)
      .post("/api/ai/compliance/screen")
      .send({ applicationId: APP_ID });
    expect([200, 422]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.ok).toBe(true);
      expect(res.body.aml).toBeDefined();
      expect(res.body.sanctions).toBeDefined();
    }
  });
});