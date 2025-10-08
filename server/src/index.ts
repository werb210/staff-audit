// server/src/index.ts
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { S3Client } from '@aws-sdk/client-s3';
import { Twilio } from 'twilio';

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// ---- Root homepage ----
app.get('/', (_req, res) => {
  res.send(`
    <html>
      <head>
        <title>Boreal Staff Server</title>
        <style>
          body { font-family: sans-serif; padding: 2rem; background: #f8fafc; color: #111; }
          h1 { color: #0369a1; }
          a { color: #2563eb; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>🚀 Boreal Staff Server Running</h1>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        <p>Links:</p>
        <ul>
          <li><a href="/api/health" target="_blank">/api/health</a></li>
          <li><a href="/api/pipeline/stats" target="_blank">/api/pipeline/stats</a></li>
          <li><a href="/api/contacts" target="_blank">/api/contacts</a></li>
        </ul>
      </body>
    </html>
  `);
});

// ---- AWS S3 client ----
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// ---- Twilio client ----
let twilioClient: Twilio | null = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// ---- Health check ----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ---- Pipeline stats ----
app.get('/api/pipeline/stats', (_req, res) => {
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

// ---- Contacts ----
app.get('/api/contacts', (_req, res) => {
  res.json({ contacts: [] });
});

// ---- Documents ----
app.post('/api/documents', (_req, res) => {
  res.json({ message: 'upload stub' });
});

app.put('/api/documents/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  res.json({ id, status });
});

// ---- Dialer ----
app.post('/api/dialer/call', async (req, res) => {
  if (!twilioClient) {
    return res.status(503).json({ error: 'Twilio not configured' });
  }
  const { to, from } = req.body;
  try {
    const call = await twilioClient.calls.create({
      to,
      from,
      url: 'http://demo.twilio.com/docs/voice.xml',
    });
    res.json({ callSid: call.sid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Dialer error' });
  }
});

// ---- Start server ----
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Boreal Staff Server running at http://localhost:${port}`);
  console.log(`🌐 Accessible via Codespaces public URL`);
});
