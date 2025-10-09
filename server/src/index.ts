import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();
const app = express();

// ✅ Force Codespaces-compatible host and port
const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const host = "0.0.0.0";

// ✅ Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// ✅ Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ Root route
app.get("/", (_req, res) => {
  res.type("html").send(`
    <html><body>
      <h1>✅ Boreal Staff Server Running</h1>
      <p>Environment: development</p>
      <ul>
        <li><a href="/api/health" target="_blank">/api/health</a></li>
        <li><a href="/api/pipeline/stats" target="_blank">/api/pipeline/stats</a></li>
        <li><a href="/api/contacts" target="_blank">/api/contacts</a></li>
        <li><a href="/api/env-check" target="_blank">/api/env-check</a></li>
      </ul>
      <p>Server running on port ${port}</p>
    </body></html>
  `);
});

// ✅ Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV || "development" });
});

// ✅ Pipeline placeholder
app.get("/api/pipeline/stats", (_req, res) => {
  res.json({ applications: 0, documents: 0, lenders: 0 });
});

// ✅ Contacts endpoint
app.get("/api/contacts", async (_req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email FROM contacts LIMIT 10;");
    res.json(result.rows);
  } catch (err: any) {
    console.error("Database error:", err.message);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// ✅ Env check
app.get("/api/env-check", (_req, res) => {
  const mask = (v: string | undefined) =>
    v ? v.slice(0, 3) + "***" + v.slice(-3) : "❌ missing";
  res.json({
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: mask(process.env.DATABASE_URL),
    AWS_REGION: mask(process.env.AWS_REGION),
    TWILIO_ACCOUNT_SID: mask(process.env.TWILIO_ACCOUNT_SID),
  });
});

// ✅ Catch-all for missing routes
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ✅ Start server with Codespaces-safe binding
app.listen(port, host, () => {
  console.log(`✅ Boreal Staff Server running on http://${host}:${port}`);
  console.log(`🌐 Codespaces URL should be: https://${process.env.CODESPACE_NAME}-${port}.app.github.dev`);
});
