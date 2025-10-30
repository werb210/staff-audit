import { TenantRepo } from "../baseRepo";
import { Contact, TenantId } from "../types";

export const contactsRepo = {
  async get(tenantId: TenantId, id: string): Promise<Contact | null> {
    // Use existing contacts table - may need to adjust filter based on actual schema
    const rows = await q<Contact>(`SELECT * FROM contacts WHERE id=$1`, [id]);
    return rows[0] || null;
  },
  async getAll(tenantId?: TenantId): Promise<Contact[]> {
    return q<Contact>(`SELECT * FROM contacts ORDER BY createdAt DESC`);
  },
  async create(c: Partial<Contact> & { id: string }): Promise<Contact> {
    const rows = await q<Contact>(
      `INSERT INTO contacts (id, full_name, email, phone, role, company_name, source, status, createdAt, updatedAt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
       RETURNING *`,
      [c.id, c.full_name||null, c.email||null, c.phone||null, c.role||'contact', c.company_name||null, c.source||'direct', c.status||'active']
    );
    return rows[0];
  },
  async update(id: string, updates: Partial<Contact>): Promise<Contact | null> {
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
    const sql = `UPDATE contacts SET ${fields.join(',')}, updatedAt=NOW() WHERE id=$${paramIndex} RETURNING *`;
    const rows = await q<Contact>(sql, values);
    return rows[0] || null;
  }
};