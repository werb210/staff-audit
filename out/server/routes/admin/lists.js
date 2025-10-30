import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
const router = Router();
function qp(q) { return { search: String(q.search || "").trim(), offset: Number(q.offset || 0), limit: Math.min(200, Math.max(1, Number(q.limit || 50))) }; }
function daterange(q, col) {
    const from = q.from ? sql `${sql.raw(col)} >= ${q.from}` : sql ``;
    const to = q.to ? sql `${sql.raw(col)} <= ${q.to}` : sql ``;
    return { from, to };
}
router.get("/contacts", async (req, res) => {
    const { search, offset, limit } = qp(req.query);
    const { from, to } = daterange(req.query, "c.createdAt");
    const where = sql.join([search ? sql `(lower(contacts.email) LIKE ${"%" + search.toLowerCase() + "%"} OR lower(contacts.full_name) LIKE ${"%" + search.toLowerCase() + "%"})` : sql `true`,
        req.query.from ? from : sql `true`,
        req.query.to ? to : sql `true`], sql ` AND `);
    const r = await db.execute(sql `SELECT contacts.id, contacts.full_name, contacts.email, contacts.createdAt FROM contacts WHERE ${where} ORDER BY contacts.createdAt DESC OFFSET ${offset} LIMIT ${limit}`);
    res.json({ rows: r.rows || [], next: offset + (r.rows?.length || 0) });
});
router.get("/applications", async (req, res) => {
    const { search, offset, limit } = qp(req.query);
    const status = String(req.query.status || "");
    const whereParts = [
        search ? sql `(a.id::text LIKE ${"%" + search + "%"} OR lower(a.status) LIKE ${"%" + search.toLowerCase() + "%"})` : sql `true`,
    ];
    if (status)
        whereParts.push(sql `a.status=${status}`);
    const { from, to } = daterange(req.query, "a.createdAt");
    if (req.query.from)
        whereParts.push(from);
    if (req.query.to)
        whereParts.push(to);
    const where = sql.join(whereParts, sql ` AND `);
    const r = await db.execute(sql `SELECT a.id, a.contact_id, a.status, a.createdAt FROM applications a WHERE ${where} ORDER BY a.createdAt DESC OFFSET ${offset} LIMIT ${limit}`);
    res.json({ rows: r.rows || [], next: offset + (r.rows?.length || 0) });
});
/* Bulk actions for applications */
router.post("/applications/bulk/status", async (req, res) => {
    const ids = (req.body?.ids || []).map((x) => String(x)).filter(Boolean);
    const status = String(req.body?.status || "");
    if (!ids.length || !status)
        return res.status(400).json({ error: "ids_and_status_required" });
    await db.execute(sql `UPDATE applications SET status=${status} WHERE id = ANY(${ids}::uuid[])`);
    res.json({ ok: true, count: ids.length });
});
/* Unified search */
router.get("/search", async (req, res) => {
    const q = String(req.query.q || "").trim().toLowerCase();
    if (!q)
        return res.json({ contacts: [], applications: [], documents: [] });
    const contacts = await db.execute(sql `SELECT id, full_name, email FROM contacts WHERE lower(email) LIKE ${"%" + q + "%"} OR lower(full_name) LIKE ${"%" + q + "%"} ORDER BY createdAt DESC LIMIT 10`);
    const applications = await db.execute(sql `SELECT id, status FROM applications WHERE id::text LIKE ${"%" + q + "%"} OR lower(status) LIKE ${"%" + q + "%"} ORDER BY createdAt DESC LIMIT 10`);
    const documents = await db.execute(sql `SELECT id, type FROM documents WHERE id::text LIKE ${"%" + q + "%"} OR lower(type) LIKE ${"%" + q + "%"} ORDER BY createdAt DESC LIMIT 10`);
    res.json({ contacts: contacts.rows || [], applications: applications.rows || [], documents: documents.rows || [] });
});
export default router;
