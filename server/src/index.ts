// server/src/index.ts
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { Router } from "express";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const app = express();
const port = process.env.PORT || 3001;

// middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ Root route — always responds with HTML
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
      </style>
    </head>
    <body>
      <h1>✅ Boreal Staff Server Running</h1>
      <p>Environment: development</p>
      <ul>
        <li><a href="/api/health" target="_blank">/api/health</a></li>
        <li><a href="/api/pipeline/stats" target="_blank">/api/pipeline/stats</a></li>
        <li><a href="/api/contacts" target="_blank">/api/contacts</a></li>
        <li><a href="/api/env-check" target="_blank">/api/env-check</a></li>
      </ul>
      <p>Server port: ${port}</p>
    </body>
    </html>
  `);
});

// ✅ Health route
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", environment: "development" })
);

// ✅ Pipeline stats placeholder
app.get("/api/pipeline/stats", (_req, res) =>
  res.json({ applications: 0, documents: 0, lenders: 0 })
);

// ✅ Inline Contacts route (standalone, no import needed)
app.get("/api/contacts", async (_req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email FROM contacts LIMIT 10;");
    res.json(result.rows);
  } catch (err: any) {
    console.error("Database error:", err.message);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// ✅ Environment check route
app.get("/api/env-check", (_req, res) => {
  const mask = (v: string | undefined) =>
    v ? v.slice(0, 3) + "***" + v.slice(-3) : "❌ missing";
  res.json({
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    AWS_REGION: mask(process.env.AWS_REGION),
    S3_BUCKET: mask(process.env.S3_BUCKET),
    TWILIO_ACCOUNT_SID: mask(process.env.TWILIO_ACCOUNT_SID),
    TWILIO_PHONE_NUMBER: mask(process.env.TWILIO_PHONE_NUMBER),
    OPENAI_API_KEY: mask(process.env.OPENAI_API_KEY),
    DATABASE_URL: mask(process.env.DATABASE_URL),
  });
});

// fallback
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// start server
app.listen(Number(port), "0.0.0.0", () => {
  console.log(`✅ Boreal Staff Server running at http://localhost:${port}`);
  console.log("🌐 Accessible via Codespaces (Ports → 3001 → Open in Browser)");
});
