import express from "express";
import { registerRoutes } from "./routes/index.js";

export default async function boot(app: express.Application) {
  console.log("@ Restoring full route mount...");
  registerRoutes(app);

  app.get("/api/_int/state", (_req, res) => {
    res.json({ ok: true, state: "ready", ts: new Date().toISOString() });
  });

  console.log("✅ All routes mounted successfully");
}
