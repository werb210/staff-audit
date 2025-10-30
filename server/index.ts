import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";

import contactsRouter from "./routes/contacts.js";
import pipelineRouter from "./routes/pipeline.mjs";
import healthRouter from "./routes/_int/index.js";

// --- Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = "0.0.0.0"; // required for Codespaces/GitHub Dev ports

// --- Middleware ---
app.use(
  cors({
    origin: [
      "https://staff.boreal.financial",
      "https://boreal.financial",
      "http://localhost:5173",
      /\.github\.dev$/,
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(bodyParser.json({ limit: "25mb" }));

// --- Routes ---
app.use("/api/_int", healthRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/pipeline", pipelineRouter);

// --- Serve built client ---
const clientDist = path.resolve(process.cwd(), "client/dist");
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (_, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// --- Health endpoints ---
app.get("/health", (_, res) => res.status(200).send("OK"));
app.get("/api/_int/build", (_, res) =>
  res.status(200).json({
    ok: true,
    env: process.env.NODE_ENV || "unknown",
    clientDist,
  })
);

// --- Start server ---
app.listen(PORT, HOST, () => {
  console.log(`✅ Staff backend running at http://${HOST}:${PORT}`);
  console.log(`🧩 Serving static files from: ${clientDist}`);
});
