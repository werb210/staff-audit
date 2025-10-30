import { Router } from "express";
import { db } from "../db/drizzle.js";
const r = Router();
r.get("/activities", async (req, res) => {
    const { contactId, applicationId, limit = "50", cursor } = req.query;
    const where = {};
    if (contactId)
        where.contactId = String(contactId);
    if (applicationId)
        where.applicationId = String(applicationId);
    const rows = await db.activity.findMany({
        where,
        take: Number(limit),
        ...(cursor ? { skip: 1, cursor: { id: String(cursor) } } : {}),
        orderBy: { createdAt: "desc" },
    });
    res.json({ ok: true, items: rows, nextCursor: rows.at(-1)?.id ?? null });
});
export default r;
