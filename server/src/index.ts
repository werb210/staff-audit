import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { Pool } from "pg";
import contactsRouter from "./routes/contacts"; // ✅ use your new contacts route

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

// Debug: list registered routes
const listRoutes = () => {
  const out: string[] = [];
  (app as any)._router.stack.forEach((layer: any) => {
    if (layer.route?.path) {
      const methods = Object.keys(layer.route.methods)
        .map((m) => m.toUpperCase())
        .join(",");
      out.push(`${methods} ${layer.route.path}`);
    }
  });
  return out;
};

// Root
app.get("/", (_req, res) => {
  res.type("html").send(`
    <html><body>
      <h1>✅ Boreal Staff Server Running</h1>
      <ul>
        <li><a href="/api/health" target="_blank">/api/health</a></li>
        <li><a href="/api/pipeline/stats" target="_blank">/api/pipeline/stats</a></li>
        <li><a href="/api/contacts" target="_blank">/api/contacts</a></li>
        <li><a href="/api/env-check" target="_blank">/api/env-check</a></li>
      </ul>
      <p>Port: ${port}</p>
    </body></html>
  `);
});

app.get("/ping", (_req, res) => res.send("pong"));

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", environment: process.env.NODE_ENV || "development" })
);

app.get("/api/pipeline/stats", (_req, res) =>
  res.json({ applications: 0, documents: 0, lenders: 0 })
);

// ✅ use the proper contacts router now
app.use("/api/contacts", contactsRouter);

app.get("/api/env-check", (_req, res) => {
  const mask = (v?: string) => (v ? v.slice(0, 3) + "***" + v.slice(-3) : "❌ missing");
  res.json({
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: mask(process.env.DATABASE_URL),
  });
});

app.get("/__routes", (_req, res) => res.json(listRoutes()));

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

app.listen(port, host, () => {
  console.log(`✅ Server running at http://${host}:${port}`);
});
