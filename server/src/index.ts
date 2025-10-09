// server/src/index.ts
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();
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
      </ul>
      <p>Server port: ${port}</p>
    </body>
    </html>
  `);
});

// simple test endpoints
app.get("/api/health", (_req, res) => res.json({ status: "ok", environment: "development" }));
app.get("/api/pipeline/stats", (_req, res) => res.json({ applications: 0, documents: 0, lenders: 0 }));
app.get("/api/contacts", (_req, res) => res.json({ contacts: [] }));

// fallback
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// start
app.listen(Number(port), "0.0.0.0", () => {
  console.log(`✅ Boreal Staff Server running at http://localhost:${port}`);
  console.log("🌐 Accessible via Codespaces (Ports → 3001 → Open in Browser)");
});
