import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";

// Routers
import contactsRouter from "./routes/contacts.js";
import pipelineRouter from "./routes/pipeline.js";
import healthRouter from "./routes/_int/index.js";

// ==================================================
// PATH + ENV SETUP
// ==================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Elastic Beanstalk or Codespaces sets PORT automatically
const PORT = parseInt(process.env.PORT || "8080", 10);

// ==================================================
// ENV VALIDATION
// ==================================================
if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL not set. Running in degraded mode (testing only).");
}

// ==================================================
// GLOBAL MIDDLEWARE
// ==================================================
app.use(
  cors({
    origin: [
      "https://staff.boreal.financial",
      "https://boreal.financial",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(bodyParser.json({ limit: "25mb" }));

// ==================================================
// ROUTES
// ==================================================
app.use("/api/_int", healthRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/pipeline", pipelineRouter);

// ==================================================
// STATIC FRONTEND SERVE (SPA FIXED)
// ==================================================
const clientDist = path.resolve(process.cwd(), "client/dist");
console.log("Serving static files from:", clientDist);
app.use(express.static(clientDist));

// Health probe for platforms
app.get("/api/_int/build", (_, res) =>
  res.status(200).json({ ok: true, env: process.env.NODE_ENV || "unknown" })
);

// ✅ SPA fallback for all non-API routes, including "/"
app.get(/^\/(?!api).*/, (_, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// ==================================================
// SERVER START
// ==================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Staff backend running on port ${PORT} (${process.env.NODE_ENV})`);
});

// ==================================================
// GRACEFUL SHUTDOWN
// ==================================================
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully...");
  process.exit(0);
});
