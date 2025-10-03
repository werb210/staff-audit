import { Router } from "express";
const r = Router();

const PATHS = ["/", "/portal", "/contacts", "/lenders", "/marketing"];

r.get("/portal/ops/route-inspector", async (req: any, res: any) => {
  const base = `${req.protocol}://${req.get("host")}`;
  console.log(`[ROUTE-INSPECTOR] Testing paths from base: ${base}`);
  
  try {
    const checks = await Promise.all(PATHS.map(async p => {
      try {
        const resp = await fetch(base + p);
        const text = await resp.text();
        return {
          path: p,
          status: resp.status,
          type: resp.headers.get("content-type"),
          servedFrom: resp.headers.get("x-served-from"),
          indexHash: resp.headers.get("x-index-hash"),
          looksLikeHtml: text.includes("<div") && text.includes("</html>"),
          hasReactRoot: text.includes('id="root"'),
          size: text.length
        };
      } catch (error: unknown) {
        return {
          path: p,
          status: -1,
          error: error instanceof Error ? error.message : String(error),
          looksLikeHtml: false,
          hasReactRoot: false
        };
      }
    }));

    const allGood = checks.every(c => c.status === 200 && c.looksLikeHtml && c.hasReactRoot);
    
    res.setHeader("Cache-Control", "no-store");
    res.json({ 
      ok: allGood, 
      checks,
      summary: {
        total: checks.length,
        passing: checks.filter(c => c.status === 200 && c.looksLikeHtml).length,
        uniqueHashes: [...new Set(checks.map(c => c.indexHash).filter(Boolean))],
        commonServedFrom: checks[0]?.servedFrom
      }
    });
  } catch (error: unknown) {
    res.status(500).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : String(error),
      message: "Route inspector failed to run checks"
    });
  }
});

export default r;