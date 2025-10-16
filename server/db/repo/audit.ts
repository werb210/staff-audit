import { pool } from "../pool";
const q = pool.query.bind(pool);
import { TenantId } from "../types";

export const auditRepo = {
  async log(tenantId: TenantId, actor: string|undefined, action: string, details?: any) {
    // Use existing audit_log table
    return q(`INSERT INTO audit_log (user_id, tenant_id, endpoint, method, request_data, timestamp) 
              VALUES ($1,$2,$3,$4,$5,NOW())`, 
             [actor||null, tenantId||null, action, 'POST', JSON.stringify(details||{})]);
  },
  async recent(tenantId?: TenantId, limit=200) {
    if (tenantId) {
      return q(`SELECT * FROM audit_log WHERE tenant_id=$1 ORDER BY timestamp DESC LIMIT $2`, [tenantId, limit]);
    }
    return q(`SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT $1`, [limit]);
  },
  async getByUser(userId: string, limit=100) {
    return q(`SELECT * FROM audit_log WHERE user_id=$1 ORDER BY timestamp DESC LIMIT $2`, [userId, limit]);
  }
};