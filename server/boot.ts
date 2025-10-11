// server/boot.ts
import type { Express } from "express";
import { attachUserIfPresent } from "./mw/jwt-auth.js";
import { setupAuth } from "./auth/routes.js";

// ✅ Import using * to handle both ESM and CommonJS interop
import * as routesModule from "./routes/index.js";
const routes =
  typeof routesModule.default === "function"
    ? routesModule.default
    : routesModule;

// 🧩 Boot function
export default async function boot(app: Express) {
  // 1️⃣ Auth routes
  setupAuth(app);

  // 2️⃣ JWT user attach middleware
  app.use(attachUserIfPresent);

  // 3️⃣ Mount all API routes (handle object default case)
  app.use("/api", routes);

  // 4️⃣ Minimal health check
  app.get("/api/_int/state", (_req, res) => {
    res.json({
      ok: true,
      status: "healthy",
      ts: new Date().toISOString(),
    });
  });
}
