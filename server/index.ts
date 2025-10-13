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
import { applyBodyParserFix } from "./patches/fix-body-parser"; // ✅ enhanced parser

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ Apply enhanced body parser before anything else
applyBodyParserFix(app);

// ✅ Security and performance middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(cookieParser());

// ✅ Static file serving
const distPath = path.resolve(__dirname, "../client/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log("📦 Serving static files from:", distPath);
} else {
  console.warn("⚠️  No client build found at:", distPath);
}

// ✅ API Routes
import apiRouter from "./api/index.js";
app.use("/api", apiRouter);

// ✅ Healthcheck endpoint
app.get("/api/_int/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ✅ SPA fallback for client-side routing
app.get("*", (req, res) => {
  const indexFile = path.join(distPath, "index.html");
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send("⚠️  No client build found; API-only mode");
  }
});

// ✅ Start server (Codespaces-safe)
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Staff App backend running on http://0.0.0.0:${PORT}`);
});

export default app;
