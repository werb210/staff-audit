import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

// Helper to fetch from canonical, then legacy
async function fetchProducts(req) {
  const base = `${req.protocol}://${req.get("host")}`;
  try {
    const r = await fetch(`${base}/api/catalog/export-products?includeInactive=1`);
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j?.products)) return { source: "catalog", products: j.products };
    }
  } catch {}
  const r2 = await fetch(`${base}/api/lender-products`);
  const j2 = await r2.json();
  return { source: "legacy", products: j2?.products ?? [] };
}

router.get("/api/catalog/dedupe", async (req, res) => {
  try {
    const { source, products } = await fetchProducts(req);
    const byId = new Map();
    const dupIds = [];
    for (const p of products) {
      const id = p.id;
      if (!id) continue;
      if (byId.has(id)) dupIds.push(id);
      else byId.set(id, true);
    }
    const sig = x => [
      (x.name ?? x.productName ?? "").toLowerCase(),
      (x.lender_name ?? x.lenderName ?? "").toLowerCase(),
      String(x.country ?? x.countryOffered ?? "").toUpperCase(),
      (x.category ?? x.productCategory ?? "").toLowerCase(),
      String(x.min_amount ?? x.minimumLendingAmount ?? 0),
      String(x.max_amount ?? x.maximumLendingAmount ?? 0),
    ].join("|");
    const seen = new Map();
    const dupSigs = [];
    for (const p of products) {
      const s = sig(p);
      if (seen.has(s)) dupSigs.push({ sig: s, id: p.id });
      else seen.set(s, p.id);
    }
    res.json({
      ok: true,
      source,
      totals: { products: products.length },
      duplicates: {
        id_count: dupIds.length,
        ids: Array.from(new Set(dupIds)),
        signature_count: dupSigs.length,
        signatures: dupSigs,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;