import express from "express";

export const LenderInspectRouter = express.Router();

function flatten(obj: any, prefix = "", out: Record<string, number> = {}) {
  Object.entries(obj || {}).forEach(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = (out[key] || 0) + 1;
  });
  return out;
}

LenderInspectRouter.get("/api/lenders/fields", async (req: any, res: any) => {
  try {
    // Reuse whatever the /api/lenders endpoint uses
    const all = (req.app.get("mem")?.lenders) || req.app.get("lenders") || [];
    const items: any[] = Array.isArray(all) ? all : [];
    const counts: Record<string, number> = {};
    items.forEach((it) => flatten(it, "", counts));

    res.json({
      ok: true,
      count: items.length,
      fields: Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});