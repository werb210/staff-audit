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

// ✅ Import API router
import apiRouter from "./api/index.js";

// Resolve dirname safely for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ Apply middleware stack
applyBodyParserFix(app);
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(cookieParser());

// ✅ Mount all API routes before static
app.use("/api", apiRouter);

// ✅ Serve built client (if exists)
const distPath = path.resolve(__dirname, "../client/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log("📦 Serving static files from:", distPath);
} else {
  console.warn("⚠️ No client build found at:", distPath);
}

// ✅ SPA fallback — only trigger for non-API requests
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});

// ✅ Boot sequence
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`🚀 Staff App backend running on http://${HOST}:${PORT}`);
});
