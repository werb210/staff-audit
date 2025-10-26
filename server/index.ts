import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";

import contactsRouter from "./routes/contacts.js";
import pipelineRouter from "./routes/pipeline.js";
import healthRouter from "./routes/_int/index.js";

// --- Fix for __dirname in ESM environments ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Elastic Beanstalk injects PORT=8080 automatically
const PORT = process.env.PORT || 8080;

// --- Verify required env vars ---
if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL not found — continuing for testing only.");
}

// --- Explicit CORS configuration ---
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

// --- Health check for EB ---
app.get("/api/_int/build", (_, res) => {
  res.status(200).json({ ok: true, source: "elasticbeanstalk" });
});

// --- Routes ---
app.use("/api/_int", healthRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/pipeline", pipelineRouter);

// --- Serve frontend build ---
const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.get("*", (_, res) => {
  res.sendFile(path.join(clientDist, "staff-portal.html"));
});

// --- Start server ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Staff backend running on port ${PORT}`);
});
