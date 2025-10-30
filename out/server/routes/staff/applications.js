import { Router } from "express";
import { pool } from "../../db";
const r = Router();
// Details for drawer
r.get("/applications/:id", async (req, res) => {
    const id = String(req.params.id);
    const appQ = await pool.query(`
    SELECT a.id, a.status, a.requested_amount, a.business_name, a.createdAt, a.updatedAt,
           u.id AS user_id, u.first_name AS user_first_name, u.last_name AS user_last_name,
           u.email AS user_email, u.phone AS user_phone
    FROM applications a
    LEFT JOIN users u ON u.id::text = a.user_id AND a.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    WHERE a.id = $1
    LIMIT 1
  `, [id]);
    if (!appQ.rows.length)
        return res.status(404).json({ error: "application_not_found" });
    const app = appQ.rows[0];
    const docs = await pool.query(`SELECT COUNT(*)::int AS count FROM documents WHERE applicationId = $1 AND status IN ('pending','accepted')`, [id]);
    const acts = await pool.query(`SELECT id, applicationId, from_stage, to_stage, actor, note, createdAt
       FROM pipeline_activity
      WHERE applicationId = $1
      ORDER BY createdAt DESC, id DESC
      LIMIT 20`, [id]);
    res.json({
        id: app.id,
        status: app.status,
        fundingAmount: app.requested_amount,
        businessName: app.business_name,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        user: {
            id: app.user_id,
            firstName: app.user_first_name,
            lastName: app.user_last_name,
            email: app.user_email,
            phone: app.user_phone,
        },
        documents: { count: docs.rows[0]?.count ?? 0 },
        activity: acts.rows,
    });
});
export default r;
