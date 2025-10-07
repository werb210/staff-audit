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

// Initialize AWS S3 client (placeholder)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Initialize Twilio client (placeholder)
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID || '',
  process.env.TWILIO_AUTH_TOKEN || ''
);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Fetch pipeline stats
app.get('/api/pipeline/stats', async (_req, res) => {
  // TODO: query DB for real stats
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

// Fetch contacts list
app.get('/api/contacts', async (_req, res) => {
  // TODO: query DB for contacts
  res.json({ contacts: [] });
});

// Upload document to S3 (stub)
app.post('/api/documents', async (req, res) => {
  // TODO: parse file from req.body/file
  // upload to S3 using s3Client.send(...)
  res.json({ message: 'upload stub' });
});

// Accept or reject document
app.put('/api/documents/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'accepted' or 'rejected'
  // TODO: update DB record or S3 metadata accordingly
  res.json({ id, status });
});

// Dialer outbound call (stub)
app.post('/api/dialer/call', async (req, res) => {
  const { to, from } = req.body;
  try {
    // Placeholder Twilio call – remove in dev mode if not configured
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
