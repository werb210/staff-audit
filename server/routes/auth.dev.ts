// server/routes/auth.dev.ts
import { Router } from "express";
import { issueDevToken } from "../mw/auth";
const r = Router();

r.post("/dev-login", (_req, res) => {
  const user = { id: "dev-1", email: "admin@example.com", roles: ["admin","marketing","staff"] };
  const token = issueDevToken(user);
  // Removed cookie-based auth — token now returned in JSON only
  res.json({ ok: true, token, user });
});

r.get("/me", (_req, res) => res.json({ ok: true })); // sanity ping
export default r;