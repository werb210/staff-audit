import express from "express";
import routes from "./routes/index.js";

export default async function boot(app: express.Application) {
  console.log("🧩 Restoring full route mount...");
  app.use("/api", routes);

  app.get("/api/_int/state", (_req, res) => {
    res.json({ ok: true, state: "ready", ts: new Date().toISOString() });
  });

  console.log("✅ All routes mounted successfully");
}
