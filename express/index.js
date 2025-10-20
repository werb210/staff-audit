const express = require("express");
const app = express();

// Root
app.get("/", (req, res) => res.send("Hello Express!"));

// Health
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Pipeline route
app.get("/api/pipeline/cards", (req, res) => {
  res.json([
    { id: "1", stage: "New", businessName: "Sample Business", amount: 50000 },
    { id: "2", stage: "Requires Docs", businessName: "Test Co", amount: 25000 }
  ]);
});

module.exports = app;
