import { pool } from "../pool";
const q = pool.query.bind(pool);
export const appsRepo = {
    async get(tenantId, appId) {
        // Use existing applications table
        const rows = await q(`SELECT * FROM applications WHERE id=$1`, [appId]);
        return rows[0] || null;
    },
    async listForLender(tenantId, lenderId) {
        return q(`SELECT * FROM applications WHERE recommended_lender_id=$1 ORDER BY updatedAt DESC`, [lenderId]);
    },
    async listAll(tenantId) {
        return q(`SELECT * FROM applications ORDER BY updatedAt DESC`);
    },
    async create(app) {
        const rows = await q(`INSERT INTO applications (id, user_id, businessId, status, requested_amount, createdAt, updatedAt)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
       RETURNING *`, [app.id, app.contact_id || null, null, app.status || 'pending', app.requested_amount || null]);
        return rows[0];
    },
    async update(tenantId, appId, patch) {
        const fields = [];
        const vals = [];
        let i = 1;
        for (const [k, v] of Object.entries(patch)) {
            if (k !== 'id') {
                fields.push(`${k}=$${i++}`);
                vals.push(v);
            }
        }
        if (fields.length === 0)
            return null;
        vals.push(appId);
        const sql = `UPDATE applications SET ${fields.join(",")}, updatedAt=NOW() WHERE id=$${i} RETURNING *`;
        const rows = await q(sql, vals);
        return rows[0] || null;
    },
    async moveToStage(tenantId, appId, stage) {
        const rows = await q(`UPDATE applications SET stage=$1, updatedAt=NOW() WHERE id=$2 RETURNING *`, [stage, appId]);
        return rows[0] || null;
    }
};
