import { Router } from "express";
import { requireRole } from "../security/rbac";
const router = Router();

// Visible to lender users only
router.get("/me/products", requireRole(["lender","admin","manager"]), (_req,res)=>{
  // TODO pull from DB; reusing earlier shim
  const prods = [
    { id: "lp-1", name: "Small Business Line of Credit", minAmount: 10000, maxAmount: 500000, rate: 8.5 },
    { id: "lp-2", name: "Equipment Financing", minAmount: 25000, maxAmount: 2000000, rate: 7.2 },
    { id: "lp-3", name: "Working Capital Loan", minAmount: 50000, maxAmount: 1000000, rate: 9.1 }
  ];
  res.json({ items: prods });
});

router.post("/me/products", requireRole(["lender","admin","manager"]), (req,res)=>{
  // Upsert (stub; replace with DB call)
  // Expect body: { id?, lenderId?, ... }
  res.json({ ok:true, product: req.body });
});

router.get("/me/apps", requireRole(["lender","admin","manager"]), async (req,res)=>{
  // Show apps currently Off to Lender for this lender (stubbed list)
  res.json({ items: [] });
});

export default router;