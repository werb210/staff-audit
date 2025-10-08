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

// --- Health Route (root) ---
app.get("/", (_req, res) => {
  res.send(`
    <h1>🚀 Boreal Staff Server Running</h1>
    <p>Environment: ${process.env.NODE_ENV || "development"}</p>
    <ul>
      <li><a href="/api/health">/api/health</a></li>
      <li><a href="/api/pipeline/stats">/api/pipeline/stats</a></li>
      <li><a href="/api/contacts">/api/contacts</a></li>
    </ul>
  `);
});

// --- Health Check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Pipeline Stats ---
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

// --- Contacts Stub ---
app.get("/api/contacts", async (_req, res) => {
  res.json({ contacts: [] });
});

// --- Document Upload Stub ---
app.post("/api/documents", async (req, res) => {
  res.json({ message: "upload stub" });
});

// --- Twilio Dialer Stub ---
app.post("/api/dialer/call", async (req, res) => {
  const { to, from } = req.body;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return res.status(503).json({ error: "Twilio not configured" });
  }

  try {
    const twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    const call = await twilioClient.calls.create({
      to,
      from,
      url: "http://demo.twilio.com/docs/voice.xml",
    });
    res.json({ callSid: call.sid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Dialer error" });
  }
});

// --- Start Server (with Codespaces-friendly host binding) ---
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Boreal Staff Server running at http://localhost:${port}`);
  console.log(`🌐 Accessible via Codespaces public URL`);
});
