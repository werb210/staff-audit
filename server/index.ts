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
// ROUTES (API)
// ==================================================
app.use("/api/_int", healthRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/pipeline", pipelineRouter);

// ==================================================
// STATIC FRONTEND SERVE (SPA)
// ==================================================
const clientDist = path.resolve(process.cwd(), "client/dist");
console.log("Serving static files from:", clientDist);
app.use(express.static(clientDist));

// Health endpoint for Codespaces/Azure/AWS probes
app.get("/api/_int/build", (_, res) =>
  res.status(200).json({ ok: true, env: process.env.NODE_ENV || "unknown" })
);

// Serve SPA for everything except /api/*
app.get(/^\/(?!api).*/, (_, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
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
