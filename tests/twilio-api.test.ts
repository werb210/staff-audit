import request from "supertest";
import app from "../server/index";

describe("Twilio API", () => {
  it("returns a valid token", async () => {
    const res = await request(app).get("/api/twilio/token?identity=tester");
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("returns outbound voice TwiML", async () => {
    const res = await request(app).post("/api/twilio/voice");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<Dial");
    expect(res.text).toContain("+18254511768");
  });

  it("returns inbound voice TwiML", async () => {
    const res = await request(app).post("/api/twilio/voice/incoming");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<Client>staff</Client>");
  });
});
