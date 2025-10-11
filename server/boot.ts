// server/boot.ts
import type { Express } from "express";
import { attachUserIfPresent } from "./mw/jwt-auth.js";
import { setupAuth } from "./auth/routes.js";

// ✅ import as * and unwrap default export if needed
import * as apiRouterModule from "./routes/index.js";
const apiRouter = apiRouterModule.default ?? apiRouterModule;

export default async function boot(app: Express) {
  // 1️⃣ Setup authentication routes
  setupAuth(app);

  // 2️⃣ Attach req.user if JWT token present
  app.use(attachUserIfPresent);

  // 3️⃣ Mount all grouped routes under /api
  app.use("/api", apiRouter);

  // 4️⃣ Health check route
  app.get("/api/_int/state", (_req, res) => {
    res.json({
      ok: true,
      status: "healthy",
      ts: new Date().toISOString(),
    });
  });
}
