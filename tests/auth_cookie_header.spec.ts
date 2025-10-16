import request from "supertest";
import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import { setAuthCookie } from "../server/auth/cookie";

const app = express();
app.use(cookieParser());
app.post("/mint", (req,res)=>{ setAuthCookie(res, "x"); res.json({ok:true}); });

describe("Set-Cookie attributes", () => {
  let res:any;
  beforeAll(async () => {
    res = await request(app).post("/mint").send({});
  });
  it("includes expected attributes", () => {
    const sc = String(res.headers["set-cookie"]||"");
    expect(sc).toContain(process.env.COOKIE_NAME||"bf_auth");
    expect(sc.toLowerCase()).toContain("httponly");
    if ((process.env.COOKIE_SECURE||"true").toLowerCase()==="true") {
      expect(sc.toLowerCase()).toContain("secure");
    }
    const ss = (process.env.COOKIE_SAMESITE||"none").toLowerCase();
    expect(sc.toLowerCase()).toContain(`samesite=${ss}`);
    const domain = process.env.COOKIE_DOMAIN;
    if (domain) expect(sc.toLowerCase()).toContain(`domain=${domain}`.toLowerCase());
    expect(sc.toLowerCase()).toContain("path=/");
  });
});