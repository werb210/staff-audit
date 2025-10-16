import { Router } from "express";

const r = Router();

r.get("/categories", (_req, res) => {
  res.json({
    ok: true,
    categories: [
      { id: "bank", label: "Bank Statements", required: true },
      { id: "ids", label: "Government IDs", required: true },
      { id: "tax", label: "Tax Returns", required: false },
      { id: "financial", label: "Financial Statements", required: true },
      { id: "legal", label: "Legal Documents", required: false }
    ]
  });
});

r.put("/categories", (req: any, res: any) => {
  const { categories } = req.body;
  
  // In production, you'd update the database
  // For now, just echo the categories back
  res.json({ 
    ok: true, 
    message: 'Categories updated successfully',
    categories: categories || []
  });
});

export default r;