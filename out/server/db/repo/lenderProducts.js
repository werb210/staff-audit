import { pool } from "../pool";
const q = pool.query.bind(pool);
export const lenderProductsRepo = {
    async list(tenantId, lenderId) {
        if (lenderId) {
            return q(`SELECT * FROM lender_products WHERE lender_id=$1 ORDER BY updatedAt DESC`, [lenderId]);
        }
        return q(`SELECT * FROM lender_products ORDER BY updatedAt DESC`);
    },
    async get(id) {
        const rows = await q(`SELECT * FROM lender_products WHERE id=$1`, [id]);
        return rows[0] || null;
    },
    async create(p) {
        const rows = await q(`INSERT INTO lender_products (id, lender_id, name, category, min_amount, max_amount, interest_rate, term_months, active, createdAt, updatedAt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
       RETURNING *`, [p.id, p.lender_id, p.name, p.category || null, p.min_amount || null, p.max_amount || null, p.rate_apr || null, p.term_months || null, p.active ?? true]);
        return rows[0];
    },
    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id') {
                fields.push(`${key}=$${paramIndex++}`);
                values.push(value);
            }
        }
        if (fields.length === 0)
            return null;
        values.push(id);
        const sql = `UPDATE lender_products SET ${fields.join(',')}, updatedAt=NOW() WHERE id=$${paramIndex} RETURNING *`;
        const rows = await q(sql, values);
        return rows[0] || null;
    }
};
