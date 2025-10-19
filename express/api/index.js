// express/api/index.js
const express = require("express");
const app = express();

// Health
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Sales Pipeline data expected by the frontend
app.get("/api/pipeline/cards", (req, res) => {
  res.json([
    { id: "1", status: "new", businessName: "Sample Business", requestedAmount: 50000, createdAt: new Date().toISOString() },
    { id: "2", status: "qualified", businessName: "Test Co", requestedAmount: 25000, createdAt: new Date().toISOString() }
  ]);
});

// Required export for Vercel’s Node runtime
module.exports = app;
