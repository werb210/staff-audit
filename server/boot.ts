// server/boot.ts
import type { Express } from "express";
import { attachUserIfPresent } from "./mw/jwt-auth.js";
import { setupAuth } from "./auth/routes.js";
import apiRouter from "./routes/index.js"; // ✅ renamed variable for clarity

export default async function boot(app: Express) {
  // 1️⃣ Mount auth routes first
  setupAuth(app);

  // 2️⃣ Attach req.user if JWT is present
  app.use(attachUserIfPresent);

  // 3️⃣ Mount grouped routes under /api
  const unwrap = (mod: any) => (mod?.default ? mod.default : mod);
  app.use("/api", unwrap(apiRouter));

  // 4️⃣ Minimal health check endpoint
  app.get("/api/_int/state", (_req, res) => {
    res.json({
      ok: true,
      status: "healthy",
      ts: new Date().toISOString(),
    });
  });
}
