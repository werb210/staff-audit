import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";

import contactsRouter from "./routes/contacts.js";
import pipelineRouter from "./routes/pipeline.js";
import healthRouter from "./routes/_int/index.js";

// --- Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);

// --- Middleware ---
app.use(
  cors({
    origin: [
      "https://staff.boreal.financial",
      "https://boreal.financial",
      "http://localhost:5173",
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

// --- Serve client ---
const clientDist = path.resolve(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (_, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// --- Health ---
app.get("/health", (_, res) => res.status(200).send("OK"));
app.get("/api/_int/build", (_, res) =>
  res.status(200).json({ ok: true, env: process.env.NODE_ENV || "unknown" })
);

// --- Start server ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Staff backend running on port ${PORT}`);
});
