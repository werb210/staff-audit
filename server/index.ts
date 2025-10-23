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
const PORT = process.env.PORT || 8080; // Elastic Beanstalk requires port 8080

// --- Verify required env vars ---
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL missing from environment");
  process.exit(1);
}

app.use(cors());
app.use(bodyParser.json());

// --- TOP PRIORITY HEALTH CHECK ---
app.get("/api/_int/build", (_, res) => {
  res.status(200).json({ ok: true, source: "direct health check" });
});

// --- Other API routes ---
app.use("/api/_int", healthRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/pipeline", pipelineRouter);

// --- Serve frontend last ---
const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.get("*", (_, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// --- Start Server ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Staff App backend running on http://0.0.0.0:${PORT}`);
});
