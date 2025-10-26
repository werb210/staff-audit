import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";

import apiRouter from "./api/index.js";
import contactsRouter from "./routes/contacts.js";
import pipelineRouter from "./routes/pipeline.js";
import healthRouter from "./routes/_int/index.js";

// --- Fix for __dirname in ESM environments ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Elastic Beanstalk injects PORT=8080 automatically ---
const PORT = process.env.PORT || 8080;

// --- Environment validation ---
if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL not found — continuing for test mode only.");
}

// --- CORS configuration ---
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

app.use(bodyParser.json());

// --- Elastic Beanstalk health check endpoint ---
app.get("/api/_int/build", (_, res) => {
  res.status(200).json({ ok: true, source: "elasticbeanstalk" });
});

// --- Unified API routers ---
app.use("/api", apiRouter);
app.use("/api/_int", healthRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/pipeline", pipelineRouter);

// --- Serve frontend build ---
const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));

// Fallback to client portal
app.get("*", (_, res) => {
  res.sendFile(path.join(clientDist, "staff-portal.html"));
});

// --- Start server ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Staff App backend running on port ${PORT}`);
});
