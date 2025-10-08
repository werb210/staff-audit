// server/src/index.ts
import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Enable cross-origin requests & JSON parsing
app.use(cors());
app.use(bodyParser.json());

// Resolve __dirname for ES modules
const __dirname = path.resolve();

// ✅ Serve static files from the client build if it exists
const clientBuildPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientBuildPath));

// ✅ Simple homepage route
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Boreal Financial — Staff Portal</title>
        <style>
          body { font-family: Arial, sans-serif; background:#f8fafc; color:#111; padding:40px; }
          h1 { color:#0369a1; }
          a { color:#2563eb; text-decoration:none; }
        </style>
      </head>
      <body>
        <h1>🚀 Boreal Staff Server Running</h1>
        <p>Environment: ${process.env.NODE_ENV || "development"}</p>
        <p>Available routes:</p>
        <ul>
          <li><a href="/api/health" target="_blank">/api/health</a></li>
          <li><a href="/api/pipeline/stats" target="_blank">/api/pipeline/stats</a></li>
          <li><a href="/api/contacts" target="_blank">/api/contacts</a></li>
        </ul>
      </body>
    </html>
  `);
});

// ✅ API endpoints
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV || "development" });
});

app.get("/api/pipeline/stats", (_req, res) => {
  res.json({
    activeCalls: 0,
    pendingTasks: 0,
    pipelineStages: { application: 0, financials: 0, analysis: 0 },
  });
});

app.get("/api/contacts", (_req, res) => {
  res.json({ contacts: [] });
});

// ✅ Fallback for all other routes (for React Router support)
app.get("*", (req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

// ✅ Start server (bind 0.0.0.0 for Codespaces)
app.listen(Number(port), "0.0.0.0", () => {
  console.log(`✅ Boreal Staff Server running at http://localhost:${port}`);
  console.log(`🌐 Accessible via Codespaces (Ports tab → 3001 → Open in Browser)`);
});
