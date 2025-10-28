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

// Elastic Beanstalk sets PORT automatically to 8080
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
// HEALTH ENDPOINTS (MANDATORY FOR EB)
// ==================================================
app.get("/", (_, res) => res.status(200).send("OK"));
app.get("/api/_int/build", (_, res) =>
  res.status(200).json({ ok: true, env: process.env.NODE_ENV || "unknown" })
);

// ==================================================
// ROUTES
// ==================================================
app.use("/api/_int", healthRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/pipeline", pipelineRouter);

// ==================================================
// STATIC FRONTEND SERVE (SPA) — FIXED PATH
// ==================================================
const clientPath = path.resolve("client/dist");
app.use(express.static(clientPath));
app.get("*", (_, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

// ==================================================
// SERVER START
// ==================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Staff backend running on port ${PORT} (${process.env.NODE_ENV})`);
});

// graceful shutdown for EB
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully...");
  process.exit(0);
});
