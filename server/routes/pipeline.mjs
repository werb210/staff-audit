import express from "express";
const router = express.Router();

router.get("/cards", async (_, res) => {
  res.json([
    { id: 1, stage: "New", businessName: "Acme Corp", amount: 50000 },
    { id: 2, stage: "Requires Docs", businessName: "Zenith Motors", amount: 120000 },
    { id: 3, stage: "In Review", businessName: "Nova Labs", amount: 80000 },
  ]);
});

export default router;
