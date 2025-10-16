import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const host = "0.0.0.0";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

app.use(cors());
app.use(bodyParser.json());

// ✅ Correct dynamic import for tsx
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contactsRouter = (await import(path.join(__dirname, "routes", "contacts.ts"))).default;

// ✅ Mount contacts router
app.use("/api/contacts", contactsRouter);

// ✅ Root page
app.get("/", (_req, res) => {
  res.type("html").send(`
    <html><body>
      <h1>✅ Boreal Staff Server Running</h1>
      <ul>
        <li><a href="/api/health" target="_blank">/api/health</a></li>
        <li><a href="/api/pipeline/stats" target="_blank">/api/pipeline/stats</a></li>
        <li><a href="/api/contacts" target="_blank">/api/contacts</a></li>
        <li><a href="/api/contacts/seed" target="_blank">/api/contacts/seed</a></li>
        <li><a href="/api/env-check" target="_blank">/api/env-check</a></li>
        <li><a href="/__routes" target="_blank">/__routes</a></li>
      </ul>
      <p>Port: ${port}</p>
    </body></html>
  `);
});

// ✅ Simple routes
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", environment: process.env.NODE_ENV || "development" })
);

app.get("/api/pipeline/stats", (_req, res) =>
  res.json({ applications: 0, documents: 0, lenders: 0 })
);

app.get("/api/env-check", (_req, res) => {
  const mask = (v?: string) => (v ? v.slice(0, 3) + "***" + v.slice(-3) : "❌ missing");
  res.json({
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: mask(process.env.DATABASE_URL),
  });
});

// ✅ Debug route list
app.get("/__routes", (_req, res) => {
  const out: string[] = [];
  (app as any)._router.stack.forEach((layer: any) => {
    if (layer.route?.path) {
      const methods = Object.keys(layer.route.methods)
        .map((m) => m.toUpperCase())
        .join(",");
      out.push(`${methods} ${layer.route.path}`);
    }
  });
  res.json(out);
});

// ✅ 404 fallback
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ✅ Start server
app.listen(port, host, () => {
  console.log("✅ Contacts table ready");
  console.log(`✅ Server running on http://${host}:${port}`);
});
