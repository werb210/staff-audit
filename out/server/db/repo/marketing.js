import { pool } from "../pool";
const q = pool.query.bind(pool);
export const marketingRepo = {
    async logIntake(e) {
        // Use communication_logs table for tracking marketing events
        return q(`INSERT INTO communication_logs (id, contact_id, type, direction, content, createdAt)
       VALUES ($1,$2,'marketing',$3,$4,NOW()) RETURNING *`, [e.id, e.contact_id || null, 'inbound', JSON.stringify({ source: e.source, campaign: e.campaign, medium: e.medium })]).then(r => r[0] || e);
    },
    async listIntakeBetween(tenantId, from, to) {
        if (from && to) {
            return q(`SELECT * FROM communication_logs WHERE type='marketing' AND createdAt BETWEEN $1 AND $2 ORDER BY createdAt DESC`, [from, to]);
        }
        return q(`SELECT * FROM communication_logs WHERE type='marketing' ORDER BY createdAt DESC`);
    },
    async upsertCost(c) {
        // For now, return the cost data as there's no specific marketing costs table
        return {
            id: `mc-${Date.now()}`,
            campaign: c.campaign,
            month: c.month,
            cost: c.cost
        };
    },
    async getCosts(campaign) {
        // Return empty array for now
        return [];
    }
};
