export const contactsRepo = {
    async get(tenantId, id) {
        // Use existing contacts table - may need to adjust filter based on actual schema
        const rows = await q(`SELECT * FROM contacts WHERE id=$1`, [id]);
        return rows[0] || null;
    },
    async getAll(tenantId) {
        return q(`SELECT * FROM contacts ORDER BY createdAt DESC`);
    },
    async create(c) {
        const rows = await q(`INSERT INTO contacts (id, full_name, email, phone, role, company_name, source, status, createdAt, updatedAt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
       RETURNING *`, [c.id, c.full_name || null, c.email || null, c.phone || null, c.role || 'contact', c.company_name || null, c.source || 'direct', c.status || 'active']);
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
        const sql = `UPDATE contacts SET ${fields.join(',')}, updatedAt=NOW() WHERE id=$${paramIndex} RETURNING *`;
        const rows = await q(sql, values);
        return rows[0] || null;
    }
};
