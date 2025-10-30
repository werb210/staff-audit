import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
dotenv.config();
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8081;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
app.use(cors());
app.use(bodyParser.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contactsRouter = (await import(path.join(__dirname, "routes", "contacts.ts"))).default;
app.use("/api/contacts", contactsRouter);
app.get("/", (_req, res) => {
    res.type("html").send(`<h1>✅ Boreal Staff Server Running</h1><p>Port: ${PORT}</p>`);
});
app.get("/api/health", (_req, res) => res.json({ status: "ok", environment: process.env.NODE_ENV || "development" }));
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
// ✅ EB-compatible start
app.listen(PORT, "0.0.0.0", () => console.log(`✅ Server running on port ${PORT}`));
