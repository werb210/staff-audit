const express = require("express");
const cors = require("cors");
const app = express();

app.use(
  cors({
    origin: [
      "https://werb210.github.io",
      "https://boreal-staff.vercel.app",
      "https://boreal-financial.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json());

// Base
app.get("/", (req, res) => res.send("Hello Express!"));

// Health
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Pipeline
app.get("/api/pipeline/cards", (req, res) => {
  res.json([
    { id: "1", stage: "New", businessName: "Sample Business", amount: 50000 },
    { id: "2", stage: "Requires Docs", businessName: "Test Co", amount: 25000 }
  ]);
});

app.get("/api/pipeline/cards/:id/application", (req, res) =>
  res.json({ id: req.params.id, data: "Sample Application Data" })
);

app.get("/api/pipeline/cards/:id/documents", (req, res) =>
  res.json([{ id: 1, name: "BankStatement.pdf", status: "accepted" }])
);

app.get("/api/pipeline/board", (req, res) =>
  res.json([{ stage: "Requires Docs", applications: [2] }])
);

// Contacts
let contacts = [];
app.get("/api/contacts", (req, res) => res.json(contacts));
app.post("/api/contacts", (req, res) => {
  const newContact = { id: Date.now(), ...req.body };
  contacts.push(newContact);
  res.status(201).json(newContact);
});
app.put("/api/contacts/:id", (req, res) => {
  const id = parseInt(req.params.id);
  contacts = contacts.map(c => (c.id === id ? { ...c, ...req.body } : c));
  res.json({ updated: true });
});
app.delete("/api/contacts/:id", (req, res) => {
  const id = parseInt(req.params.id);
  contacts = contacts.filter(c => c.id !== id);
  res.json({ deleted: true });
});

// Local Run
if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Boreal Staff API running on ${port}`));
}

module.exports = app;
