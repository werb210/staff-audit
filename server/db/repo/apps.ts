import { pool } from "../pool";
const q = pool.query.bind(pool);
import { Application, Stage, TenantId } from "../types";

export const appsRepo = {
  async get(tenantId: TenantId, appId: string): Promise<Application|null> {
    // Use existing applications table
    const rows = await q<Application>(`SELECT * FROM applications WHERE id=$1`, [appId]);
    return rows[0] || null;
  },
  async listForLender(tenantId: TenantId, lenderId: string) {
    return q<Application>(`SELECT * FROM applications WHERE recommended_lender_id=$1 ORDER BY updated_at DESC`, [lenderId]);
  },
  async listAll(tenantId?: TenantId) {
    return q<Application>(`SELECT * FROM applications ORDER BY updated_at DESC`);
  },
  async create(app: Partial<Application> & { id: string }): Promise<Application> {
    const rows = await q<Application>(
      `INSERT INTO applications (id, user_id, business_id, status, requested_amount, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
       RETURNING *`,
      [app.id, app.contact_id||null, null, app.status||'pending', app.requested_amount||null]
    );
    return rows[0];
  },
  async update(tenantId: TenantId, appId: string, patch: Partial<Application>) {
    const fields = [];
    const vals: any[] = [];
    let i = 1;
    
    for (const [k,v] of Object.entries(patch)) {
      if (k !== 'id') {
        fields.push(`${k}=$${i++}`);
        vals.push(v);
      }
    }
    
    if (fields.length === 0) return null;
    
    vals.push(appId);
    const sql = `UPDATE applications SET ${fields.join(",")}, updated_at=NOW() WHERE id=$${i} RETURNING *`;
    const rows = await q<Application>(sql, vals);
    return rows[0] || null;
  },
  async moveToStage(tenantId: TenantId, appId: string, stage: Stage) {
    const rows = await q<Application>(
      `UPDATE applications SET stage=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [stage, appId]
    );
    return rows[0] || null;
  }
};