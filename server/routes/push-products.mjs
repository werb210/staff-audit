import express from "express";
import fetch from "node-fetch";
const router = express.Router();

router.post("/api/_admin/push-products", async (req,res) => {
  try {
    const { CLIENT_BASE, SYNC_TOKEN } = process.env;
    if (!CLIENT_BASE || !SYNC_TOKEN) return res.status(400).json({ ok:false, error:"missing CLIENT_BASE or SYNC_TOKEN" });

    const base = `${req.protocol}://${req.get("host")}`;
    const r = await fetch(`${base}/api/v1/products`);
    const v1 = await r.json();
    const canonical = (Array.isArray(v1)?v1:[]).map(p => ({
      id: p.id,
      name: p.productName,
      lender_name: p.lenderName,
      country: String(p.countryOffered||"").toUpperCase(),
      category: p.productCategory,
      min_amount: p.minimumLendingAmount ?? null,
      max_amount: p.maximumLendingAmount ?? null,
      active: (p.isActive ?? true),
    }));

    const push = await fetch(`${CLIENT_BASE}/api/sync/lender-products`, {
      method: "POST",
      headers: { "Content-Type":"application/json", "X-Sync-Token": SYNC_TOKEN },
      body: JSON.stringify({ products: canonical })
    });
    const body = await push.text();
    res.status(push.status).type("application/json").send(body);
  } catch(e) { res.status(500).json({ ok:false, error:String(e?.message||e) }); }
});
export default router;