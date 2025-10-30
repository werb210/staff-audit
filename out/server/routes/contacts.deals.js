import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly";
const r = Router();
r.use(requireAuth);
// List deals (pipeline applications) for a contact
r.get("/contacts/:id/deals", async (req, res) => {
    const { rows } = await db.execute(sql `
    select id, full_name as name, stage, amount, createdAt
    from applications
    where contact_id = ${req.params.id}
    order by createdAt desc
  `);
    res.json({ ok: true, items: rows });
});
// Create a new deal (application) quick-add
r.post("/contacts/:id/deals", async (req, res) => {
    const { name, amount } = req.body || {};
    const { rows } = await db.execute(sql `
    insert into applications(contact_id, full_name, amount, stage)
    values(${req.params.id}, ${name || 'New Deal'}, ${amount || 0}, 'New')
    returning id
  `);
    res.json({ ok: true, id: rows[0].id });
});
export default r;
