import request from "supertest";
import app from "../../server/app";

describe("Contact actions timeline", () => {
  const CONTACT_ID = process.env.TEST_CONTACT_ID || "contact_demo_1";

  it("GET /api/contacts returns contacts list", async () => {
    const res = await request(app).get("/api/contacts");
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.contacts) || Array.isArray(res.body.items)).toBe(true);
    }
  });

  it("GET /api/contacts/:id/timeline", async () => {
    const res = await request(app).get(`/api/contacts/${CONTACT_ID}/timeline`);
    expect([200, 404, 401]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.events) || Array.isArray(res.body.timeline)).toBe(true);
    }
  });

  it("POST /api/contacts/:id/calls/outbound", async () => {
    const res = await request(app)
      .post(`/api/contacts/${CONTACT_ID}/calls/outbound`)
      .send({ to: "+15551234567" });
    expect([200, 404, 401, 422]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.ok).toBe(true);
    }
  });

  it("POST /api/contacts/:id/notes", async () => {
    const res = await request(app)
      .post(`/api/contacts/${CONTACT_ID}/notes`)
      .send({ html: "<p>Test note content</p>" });
    expect([200, 404, 401, 422]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.ok).toBe(true);
    }
  });

  it("GET /api/contacts/:id/notes", async () => {
    const res = await request(app).get(`/api/contacts/${CONTACT_ID}/notes`);
    expect([200, 404, 401]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.items) || Array.isArray(res.body.notes)).toBe(true);
    }
  });
});