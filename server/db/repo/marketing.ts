import { pool } from "../pool";
const q = pool.query.bind(pool);
import { IntakeEvent, MarketingCost, TenantId } from "../types";

export const marketingRepo = {
  async logIntake(e: Partial<IntakeEvent> & { id: string; source: string }) {
    // Use communication_logs table for tracking marketing events
    return q<IntakeEvent>(
      `INSERT INTO communication_logs (id, contact_id, type, direction, content, created_at)
       VALUES ($1,$2,'marketing',$3,$4,NOW()) RETURNING *`,
      [e.id, e.contact_id||null, 'inbound', JSON.stringify({ source: e.source, campaign: e.campaign, medium: e.medium })]
    ).then(r => r[0] || e);
  },
  async listIntakeBetween(tenantId?: TenantId, from?: string, to?: string) {
    if (from && to) {
      return q<IntakeEvent>(`SELECT * FROM communication_logs WHERE type='marketing' AND created_at BETWEEN $1 AND $2 ORDER BY created_at DESC`, [from, to]);
    }
    return q<IntakeEvent>(`SELECT * FROM communication_logs WHERE type='marketing' ORDER BY created_at DESC`);
  },
  async upsertCost(c: Omit<MarketingCost,"id">) {
    // For now, return the cost data as there's no specific marketing costs table
    return {
      id: `mc-${Date.now()}`,
      campaign: c.campaign,
      month: c.month,
      cost: c.cost
    };
  },
  async getCosts(campaign?: string) {
    // Return empty array for now
    return [];
  }
};