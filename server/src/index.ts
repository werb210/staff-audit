import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { S3Client } from "@aws-sdk/client-s3";
import { Twilio } from "twilio";

dotenv.config();
const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(bodyParser.json());

// --- AWS S3 setup ---
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

// --- Twilio setup ---
let twilioClient: Twilio | null = null;
if (process.env.TWILIO_ACCOUNT_SID?.startsWith("AC")) {
  twilioClient = new Twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );
  console.log("✅ Twilio client initialized");
} else {
  console.warn("⚠️ Skipping Twilio init — missing or invalid Account SID");
}

// --- Root route (always visible in browser) ---
app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Boreal Staff Server</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 40px; color: #222; }
        h1 { color: #007acc; }
        code { background: #f4f4f4; padding: 3px 6px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>🚀 Boreal Staff Server Running</h1>
      <p>Environment: <code>${process.env.NODE_ENV}</code></p>
      <p>Port: <code>${port}</code></p>
      <p>Time: ${new Date().toLocaleString()}</p>
      <p>
        <a href="/api/health">Check /api/health</a> |
        <a href="/api/pipeline/stats">Check /api/pipeline/stats</a>
      </p>
    </body>
    </html>
  `);
});

// --- Health check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// --- Pipeline stats ---
app.get("/api/pipeline/stats", (_req, res) => {
  res.json({
    activeCalls: 0,
    pendingTasks: 0,
    pipelineStages: { application: 0, financials: 0, analysis: 0 },
  });
});

// --- Contacts ---
app.get("/api/contacts", (_req, res) => {
  res.json({ contacts: [] });
});

// --- Document upload stub ---
app.post("/api/documents", (_req, res) => {
  res.json({ message: "Upload stub" });
});

// --- Document status ---
app.put("/api/documents/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  res.json({ id, status });
});

// --- Dialer stub ---
app.post("/api/dialer/call", async (req, res) => {
  if (!twilioClient)
    return res.status(503).json({ error: "Twilio not configured" });
  const { to, from } = req.body;
  try {
    const call = await twilioClient.calls.create({
      to,
      from,
      url: "http://demo.twilio.com/docs/voice.xml",
    });
    res.json({ callSid: call.sid });
  } catch (err) {
    console.error("Dialer error:", err);
    res.status(500).json({ error: "Dialer error" });
  }
});

// --- Start server ---
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Boreal Staff Server running at http://localhost:${port}`);
});
