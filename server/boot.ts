// server/boot.ts
import type { Express } from "express";
import { attachUserIfPresent } from "./mw/jwt-auth.js";
import { setupAuth } from "./auth/routes.js";
import router from "./routes/index.js"; // ✅ Import actual Express Router

export default async function boot(app: Express) {
  // ✅ Mount authentication routes first
  setupAuth(app);

  // ✅ Attach user context if a JWT is present
  app.use(attachUserIfPresent);

  // ✅ Mount main API router
  app.use("/api", router);

  // ✅ Minimal health check
  app.get("/api/_int/state", (_req, res) => {
    res.json({
      ok: true,
      status: "healthy",
      ts: new Date().toISOString(),
    });
  });
}
