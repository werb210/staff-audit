// server/src/index.ts
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { S3Client } from "@aws-sdk/client-s3";
import { Twilio } from "twilio";

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

// ---- Middleware ----
app.use(cors());
app.use(bodyParser.json());

// ---- Root Homepage ----
app.get("/", (_req, res) => {
  res.type("html").send(`
    <html>
      <head>
        <title>Boreal Financial - Staff Server</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; background: #f8fafc; color: #111; }
          h1 { color: #0369a1; }
          a { color: #2563eb; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>🚀 Boreal Staff Server Running</h1>
        <p>Environment: <b>${process.env.NODE_ENV || "development"}</b></p>
        <p>Available API endpoints:</p>
        <ul>
          <li><a href="/api/health" target="_blank">/api/health</a></li>
          <li><a href="/api/pipeline/stats" target="_blank">/api/pipeline/stats</a></li>
          <li><a href="/api/contacts" target="_blank">/api/contacts</a></li>
        </ul>
      </body>
    </html>
  `);
});

// ---- Health ----
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV || "development" });
});

// ---- Pipeline Stats ----
app.get("/api/pipeline/stats", (_req, res) => {
  res.json({
    activeCalls: 0,
    pendingTasks: 0,
    pipelineStages: { application: 0, financials: 0, analysis: 0 },
  });
});

// ---- Contacts ----
app.get("/api/contacts", (_req, res) => res.json({ contacts: [] }));

// ---- AWS + Twilio Initialization (safe placeholders) ----
try {
  new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
} catch (err) {
  console.error("⚠️ AWS S3 client init failed:", err);
}

try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
} catch (err) {
  console.error("⚠️ Twilio init failed:", err);
}

// ---- Start Server ----
app.listen(Number(port), "0.0.0.0", () => {
  console.log(`✅ Boreal Staff Server running at http://localhost:${port}`);
  console.log(`🌐 Accessible via GitHub Codespaces (check Ports tab → 3001 → Open in Browser)`);
});
