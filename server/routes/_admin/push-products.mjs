import express from "express";
import fetch from "node-fetch";
const router = express.Router();

router.post("/api/_admin/push-products", async (req, res) => {
  try {
    const clientBase = process.env.CLIENT_BASE;
    const token = process.env.SYNC_TOKEN;
    if (!clientBase || !token) return res.status(400).json({ ok:false, error:"missing CLIENT_BASE or SYNC_TOKEN" });

    // Pull Staff V1 (authoritative)
    const v1 = await fetch(`${req.protocol}://${req.get("host")}/api/v1/products`);
    const src = await v1.json(); // array of v1 rows

    // IMPORTANT: Map to canonical WITHOUT defaulting country to "US" + include expanded fields
    const canon = src.map(p => {
      const country = (p.countryOffered ?? p.country ?? "").toString().trim().toUpperCase();
      return {
        id: p.id,
        name: p.productName ?? p.name ?? "",
        lender_name: p.lenderName ?? p.lender_name ?? null,
        country: country || null, // <- no fake "US"
        category: p.productCategory ?? p.category ?? "Working Capital",
        min_amount: Number(p.minimumLendingAmount ?? p.min_amount ?? 0),
        max_amount: Number(p.maximumLendingAmount ?? p.max_amount ?? 0),
        active: (p.isActive ?? p.active) !== false,
        // NEW: include expanded Staff fields
        min_time_in_business: p.min_time_in_business ?? null,
        min_monthly_revenue: p.min_monthly_revenue ?? null,
        excluded_industries: p.excluded_industries ?? [],
        required_documents: p.required_documents ?? null,
      };
    });

    // Push to Client
    const r = await fetch(`${clientBase}/api/sync/lender-products`, {
      method: "POST",
      headers: { "Content-Type":"application/json", "X-Sync-Token": token },
      body: JSON.stringify({ products: canon })
    });
    const body = await r.json().catch(()=> ({}));
    
    // Generate by_country summary for response
    const by_country = Object.entries(
      canon.reduce((acc, p) => {
        const k = p.country || 'NULL';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {})
    ).map(([k, n]) => ({ k, n }));
    
    res.status(r.status).json({ 
      ok: r.ok, 
      pushed: canon.length, 
      by_country,
      expanded_fields: ['min_time_in_business', 'min_monthly_revenue', 'excluded_industries', 'required_documents'],
      client_result: body 
    });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
});
export default router;