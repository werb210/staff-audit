import { pool } from "../pool";
const q = pool.query.bind(pool);
export const lenderReportsRepo = {
    async listAll() {
        return q(`SELECT * FROM lender_reports ORDER BY createdAt DESC`);
    },
    async listForLender(tenantId, lenderId) {
        return q(`SELECT * FROM lender_reports WHERE lender_id=$1 ORDER BY createdAt DESC`, [lenderId]);
    },
    async create(r) {
        return q(`INSERT INTO lender_reports (id, lender_id, name, type, url, embed_url, createdAt)
       VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`, [r.id, r.lender_id, r.name, r.type, r.url || null, r.embed_url || null]).then(rows => rows[0]);
    },
    async remove(id) {
        return q(`DELETE FROM lender_reports WHERE id=$1`, [id]).then(r => true);
    },
    async getPrefs(lenderId) {
        // Use a simple key-value approach for preferences
        return { lender_id: lenderId, reports: [] };
    },
    async setPrefs(lenderId, reports) {
        // For now, return the input as preferences aren't stored separately
        return { lender_id: lenderId, reports, updatedAt: new Date().toISOString() };
    }
};
