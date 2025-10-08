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

app.use(cors());
app.use(bodyParser.json());

// --- AWS S3 setup ---
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
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

// --- Root route (browser visible) ---
app.get("/", (_req, res) => {
  res.send(`
    <html>
      <head>
        <title>Boreal Staff Server</title>
        <style>
          body { font-family: system-ui, sans-serif; margin: 40px; color: #222; }
          h1 { color: #007acc; }
          code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>🚀 Boreal Staff Server Running</h1>
        <p>Environment: <code>${process.env.NODE_ENV}</code></p>
        <p>Port: <code>${port}</code></p>
        <p>Time: ${new Date().toLocaleString()}</p>
        <p><a href="/api/health">/api/health</a> | <a href="/api/pipeline/stats">/api/pipeline/stats</a></p>
      </body>
    </html>
  `);
});

// --- Health check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// --- Pipeline stats (stub) ---
app.get("/api/pipeline/stats", async (_req, res) => {
  res.json({
    activeCalls: 0,
    pendingTasks: 0,
    pipelineStages: {
      application: 0,
      financials: 0,
      analysis: 0,
    },
  });
});

// --- Contacts list (stub) ---
app.get("/api/contacts", async (_req, res) => {
  res.json({ contacts: [] });
});

// --- Document upload (stub) ---
app.post("/api/documents", async (req, res) => {
  res.json({ message: "Upload stub" });
});

// --- Document status update (stub) ---
app.put("/api/documents/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  res.json({ id, status });
});

// --- Dialer call (stub) ---
app.post("/api/dialer/call", async (req, res) => {
  if (!twilioClient) {
    return res
      .status(503)
      .json({ error: "Twilio not configured (missing Account SID)" });
  }
  const { to, from } = req.body;
  try {
    const call = await twilioClient.calls.create({
      to,
      from,
      url: "http://demo.twilio.com/docs/voice.xml",
    });
    res.json({ callSid: call.sid });
  } catch (error) {
    console.error("Dialer error:", error);
    res.status(500).json({ error: "Dialer error" });
  }
});

// --- Start server ---
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
