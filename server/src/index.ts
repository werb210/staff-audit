// server/src/index.ts
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import Twilio from "twilio";
import { S3Client } from "@aws-sdk/client-s3";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- Initialize AWS S3 client ---
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ca-central-1", // 🇨🇦 Correct region
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

// --- Initialize Twilio client ---
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

// 🧭 Root route — Always responds with HTML
app.get("/", (_req, res) => {
  res.type("html").send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Boreal Financial – Staff Portal</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f9fafb; }
        h1 { color: #0369a1; }
        p { color: #111; font-size: 16px; }
        a { color: #2563eb; text-decoration: none; }
        code { background: #eee; padding: 2px 4px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>✅ Boreal Staff Server Running</h1>
      <p>Environment: <code>${process.env.NODE_ENV || "development"}</code></p>
      <ul>
        <li><a href="/api/health" target="_blank">/api/health</a></li>
        <li><a href="/api/pipeline/stats" target="_blank">/api/pipeline/stats</a></li>
        <li><a href="/api/contacts" target="_blank">/api/contacts</a></li>
        <li><a href="/api/dialer/test" target="_blank">/api/dialer/test</a></li>
      </ul>
      <p>Server port: ${port}</p>
    </body>
    </html>
  `);
});

// --- API: Health check ---
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    region: "ca-central-1",
    twilioConfigured: !!twilioClient,
    s3Configured: !!process.env.AWS_ACCESS_KEY_ID,
  });
});

// --- API: Pipeline stats (placeholder) ---
app.get("/api/pipeline/stats", (_req, res) => {
  res.json({
    applications: 0,
    documents: 0,
    lenders: 0,
  });
});

// --- API: Contacts (placeholder) ---
app.get("/api/contacts", (_req, res) => {
  res.json({ contacts: [] });
});

// --- API: Test Twilio dialer ---
app.get("/api/dialer/test", async (_req, res) => {
  if (!twilioClient) {
    return res.status(400).json({ error: "Twilio not configured" });
  }
  try {
    const response = await twilioClient.api.accounts.list({ limit: 1 });
    res.json({ twilio: "connected", accounts: response.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Twilio connection failed" });
  }
});

// --- 404 handler ---
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// --- Start server ---
app.listen(Number(port), "0.0.0.0", () => {
  console.log(`✅ Boreal Staff Server running at http://localhost:${port}`);
  console.log("🌐 Accessible via Codespaces (Ports → 3001 → Open in Browser)");
});
