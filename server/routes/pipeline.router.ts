function normalizeId(x){return x?.id||x?._id||x?.applicationId||x;}

import { Router } from "express";
import { db } from "../db/drizzle";
import { applications } from "../db/schema";
import { eq } from "drizzle-orm";

export const pipelineRouter = Router();

pipelineRouter.get("/cards/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const rows = await db.select().from(applications).where(eq(applications.id, id));
    if (rows.length === 0) return res.status(404).json({ ok: false, error: "not_found" });
    return res.json({ ok: true, card: rows[0] });
  } catch (e) {
    console.error("Pipeline card fetch error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

export default pipelineRouter;
