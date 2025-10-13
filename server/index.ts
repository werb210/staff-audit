// server/index.ts
import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import dotenv from "dotenv";
import { applyBodyParserFix } from "./patches/fix-body-parser"; // ✅ new import

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
applyBodyParserFix(app); // ✅ apply enhanced parser immediately

// Security and performance middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(cookieParser());

// ✅ remove old JSON + URL-encoded parsers
// app.use(express.json({ limit: "5mb", strict: true, type: ["application/json", "application/csp-report"] }));
// app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Static file serving
const distPath = path.resolve(__dirname, "../client/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log("📦 Serving static files from:", distPath);
} else {
  console.warn("⚠️  No client build found at:", distPath);
}

// API Routes
import apiRouter from "./api/index.js";
app.use("/api", apiRouter);

// SPA fallback for client-side routing
app.get("*", (req, res) => {
  const indexFile = path.join(distPath, "index.html");
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send("⚠️  No client build found; API-only mode");
  }
});

// Healthcheck endpoint
app.get("/api/_int/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Staff App backend running on http://localhost:${PORT}`);
});

export default app;
