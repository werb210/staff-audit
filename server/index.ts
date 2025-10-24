import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";

import { registerRoutes } from "./registerRoutes.js";

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

// --- Canonical API routes ---
registerRoutes(app);

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
