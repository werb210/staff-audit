import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/api/health", (_, res) => res.json({ ok: true }));
app.get("/api/pipeline/cards", (_, res) =>
  res.json([
    { id: 1, businessName: "Sample Business", amount: 50000 },
    { id: 2, businessName: "Test Co", amount: 25000 }
  ])
);

export default app;
