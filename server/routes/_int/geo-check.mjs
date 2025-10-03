import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

function baseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

// GET /api/_int/geo-check - Monitor geographic distribution
router.get("/api/_int/geo-check", async (req, res) => {
  try {
    const r = await fetch(`${baseUrl(req)}/api/v1/products`);
    if (!r.ok) {
      return res.status(500).json({ error: "v1_products_unavailable" });
    }
    
    const products = await r.json();
    const totals = { all: 0, CA: 0, US: 0, other: 0 };
    
    for (const product of products) {
      totals.all++;
      const country = String(product.countryOffered || '').toUpperCase();
      if (country === 'CA') {
        totals.CA++;
      } else if (country === 'US') {
        totals.US++;
      } else {
        totals.other++;
      }
    }
    
    // Health status based on expected minimums
    const healthy = totals.CA >= 10 && totals.US >= 10 && totals.all >= 30;
    
    res.json({
      totals,
      healthy,
      timestamp: new Date().toISOString(),
      breakdown: {
        ca_percentage: Math.round((totals.CA / totals.all) * 100),
        us_percentage: Math.round((totals.US / totals.all) * 100),
        other_percentage: Math.round((totals.other / totals.all) * 100)
      }
    });
    
    console.log("🌍 Geo check:", totals, healthy ? "✅" : "⚠️");
  } catch (e) {
    console.error("❌ Geo check error:", e.message);
    res.status(500).json({ error: "geo_check_failed", message: e.message });
  }
});

export default router;