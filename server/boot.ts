// server/boot.ts
import type { Express } from "express";
import { attachUserIfPresent } from "./mw/jwt-auth.js";
import { setupAuth } from "./auth/routes.js";

// Force ESM/CJS interop safety
import routesImport from "./routes/index.js";
const apiRouter =
  typeof routesImport === "function"
    ? routesImport
    : routesImport.default && typeof routesImport.default === "function"
    ? routesImport.default
    : (() => {
        console.error("[BootDiag] Invalid router import:", routesImport);
        throw new Error("Invalid router export — expected Express Router");
      })();

export default async function boot(app: Express) {
  setupAuth(app);
  app.use(attachUserIfPresent);
  app.use("/api", apiRouter);

  app.get("/api/_int/state", (_req, res) =>
    res.json({ ok: true, status: "healthy", ts: new Date().toISOString() })
  );
}
