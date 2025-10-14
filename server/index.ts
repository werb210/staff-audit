// server/index.ts
import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { applyBodyParserFix } from "./middleware/body-parser-fix.js";

// ✅ Import your API router
import apiRouter from "./api/index.js";

const app = express();

// ✅ Apply essential middleware
applyBodyParserFix(app);
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(cookieParser());

// ✅ Mount API routes BEFORE serving static files
app.use("/api", apiRouter);

// ✅ Static file serving (after API)
const distPath = path.resolve(__dirname, "../client/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log("📦 Serving static files from:", distPath);
} else {
  console.warn("⚠️  No client build found at:", distPath);
}

// ✅ Fallback route for SPA
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ✅ Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Staff App backend running on http://0.0.0.0:${PORT}`);
});
