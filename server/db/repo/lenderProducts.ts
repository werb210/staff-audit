import { pool } from "../pool";
const q = pool.query.bind(pool);
import { LenderProduct, TenantId } from "../types";

export const lenderProductsRepo = {
  async list(tenantId: TenantId, lenderId?: string) {
    if (lenderId) {
      return q<LenderProduct>(`SELECT * FROM lender_products WHERE lender_id=$1 ORDER BY updatedAt DESC`, [lenderId]);
    }
    return q<LenderProduct>(`SELECT * FROM lender_products ORDER BY updatedAt DESC`);
  },
  async get(id: string): Promise<LenderProduct | null> {
    const rows = await q<LenderProduct>(`SELECT * FROM lender_products WHERE id=$1`, [id]);
    return rows[0] || null;
  },
  async create(p: Partial<LenderProduct> & { id: string; name: string; lender_id: string }): Promise<LenderProduct> {
    const rows = await q<LenderProduct>(
      `INSERT INTO lender_products (id, lender_id, name, category, min_amount, max_amount, interest_rate, term_months, active, createdAt, updatedAt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
       RETURNING *`,
      [p.id, p.lender_id, p.name, p.category||null, p.min_amount||null, p.max_amount||null, p.rate_apr||null, p.term_months||null, p.active??true]
    );
    return rows[0];
  },
  async update(id: string, updates: Partial<LenderProduct>): Promise<LenderProduct | null> {
    const fields = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key}=$${paramIndex++}`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) return null;
    
    values.push(id);
    const sql = `UPDATE lender_products SET ${fields.join(',')}, updatedAt=NOW() WHERE id=$${paramIndex} RETURNING *`;
    const rows = await q<LenderProduct>(sql, values);
    return rows[0] || null;
  }
};