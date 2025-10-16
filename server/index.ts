// server/index.ts
import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { applyBodyParserFix } from "./middleware/body-parser-fix.js";
import apiRouter from "./api/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ Middleware stack (ensures req.body is parsed)
applyBodyParserFix(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(cookieParser());

// ✅ Mount all API routes
app.use("/api", apiRouter);

// ✅ Serve client build if present
const distPath = path.resolve(__dirname, "../client/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log("📦 Serving static files from:", distPath);
} else {
  console.warn("⚠️ No client build found at:", distPath);
}

// ✅ SPA fallback
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});

// ✅ Clean port binding (handles EADDRINUSE automatically)
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Staff App backend running on http://${HOST}:${PORT}`);
});

// Handle accidental port conflict cleanly
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} already in use. Killing old process and retrying...`);
    process.exit(1);
  } else {
    console.error("❌ Server error:", err);
    process.exit(1);
  }
});
