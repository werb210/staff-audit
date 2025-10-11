// server/boot.ts
import type { Express } from "express";
import { attachUserIfPresent } from "./mw/jwt-auth.js";
import routes from "./routes/index.js";  // ✅ Explicitly load router, not the folder
import { setupAuth } from "./auth/routes.js";

export default async function boot(app: Express) {
  // Auth routes (/api/auth/*)
  setupAuth(app);

  // Attach req.user if a JWT is present
  app.use(attachUserIfPresent);

  // Grouped API routers (integrations, etc.)
  app.use("/api", routes);

  // Minimal health check
  app.get("/api/_int/state", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });
}
