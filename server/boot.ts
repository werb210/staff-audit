// server/boot.ts
import type { Express } from "express";
import { attachUserIfPresent } from "./mw/jwt-auth.js";
import routes from "./routes/index.js";  // ✅ Load router explicitly
import { setupAuth } from "./auth/routes.js";

export default async function boot(app: Express) {
  // ✅ Mount authentication routes first
  setupAuth(app);

  // ✅ Attach user context if a JWT is present
  app.use(attachUserIfPresent);

  // ✅ Mount main API routes (from routes/index.js)
  app.use("/api", routes);

  // ✅ Health check endpoint
  app.get("/api/_int/state", (_req, res) => {
    res.json({
      ok: true,
      ts: new Date().toISOString(),
      status: "healthy",
    });
  });
}
