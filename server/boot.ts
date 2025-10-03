// server/boot.ts
import type { Express } from "express";
import { attachUserIfPresent } from "./mw/jwt-auth";
import routes from "./routes";
import { setupAuth } from "./auth/routes";

export default async function boot(app: Express) {
  // Auth routes (/api/auth/*)
  setupAuth(app);

  // Attach req.user if a JWT is present
  app.use(attachUserIfPresent);

  // Grouped API routers (integrations, etc.)
  app.use("/api", routes);

  // Minimal health
  app.get("/api/_int/state", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  // Dev-only JSON 404 for unknown API routes
  if (process.env.NODE_ENV !== "production") {
    app.use("/api/*", (req, res, next) => {
      if (res.headersSent) return next();
      res.status(404).json({ error: `API endpoint not found: ${req.path}` });
    });
  }
}
