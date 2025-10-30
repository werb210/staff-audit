import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import type { AudienceSegment, ContactState } from '../types/contactState';
import { isAudienceSegment, isContactState } from '../types/contactState';

const router = Router();

// Ensure contacts table has the necessary columns for state and audience segments
async function ensureContactsTaxonomyColumns() {
  try {
    // Add state column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS state VARCHAR(20) DEFAULT 'new'
    `);
    
    // Add audience_segments column as JSON array if it doesn't exist
    await db.execute(sql`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS audience_segments JSON DEFAULT '[]'
    `);
    
    console.log('✅ [CONTACTS-TAXONOMY] Table schema ensured');
  } catch (error: unknown) {
    console.error('❌ [CONTACTS-TAXONOMY] Schema setup failed:', error);
  }
}

// Database operations with PostgreSQL integration
const contactsDb = {
  async listContacts(params: {
    state?: ContactState[];
    audience?: AudienceSegment[];
    q?: string;
    limit?: number;
    offset?: number;
  }) {
    await ensureContactsTaxonomyColumns();
    
    let query = sql`
      SELECT id, full_name, email, phone, company_name, state, audience_segments, 
             createdAt, updatedAt
      FROM contacts 
      WHERE 1=1
    `;
    
    const conditions: any[] = [];
    
    if (params.state && params.state.length > 0) {
      conditions.push(sql`AND state = ANY(${params.state})`);
    }
    
    if (params.audience && params.audience.length > 0) {
      // Check if any of the requested segments exist in the JSON array
      for (const segment of params.audience) {
        conditions.push(sql`AND JSON_EXTRACT(audience_segments, '$') LIKE ${'%"' + segment + '"%'}`);
      }
    }
    
    if (params.q) {
      const searchTerm = `%${params.q}%`;
      conditions.push(sql`AND (
        full_name ILIKE ${searchTerm} OR 
        email ILIKE ${searchTerm} OR 
        company_name ILIKE ${searchTerm}
      )`);
    }
    
    // Apply conditions
    for (const condition of conditions) {
      query = sql`${query} ${condition}`;
    }
    
    query = sql`${query} ORDER BY updatedAt DESC`;
    
    if (params.limit) {
      query = sql`${query} LIMIT ${params.limit}`;
    }
    
    if (params.offset) {
      query = sql`${query} OFFSET ${params.offset}`;
    }
    
    const result = await db.execute(query);
    
    // Count total for pagination
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM contacts WHERE 1=1
      ${conditions.length > 0 ? sql.join(conditions, sql` `) : sql``}
    `);
    
    return { 
      items: result.rows.map((row: any) => ({
        id: row.id,
        name: row.full_name,
        email: row.email,
        phone: row.phone,
        company: row.company_name,
        state: row.state || 'new',
        audienceSegments: JSON.parse(row.audience_segments || '[]'),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      })), 
      total: parseInt((countResult.rows[0] as any)?.total || '0') 
    };
  },

  async updateContact(id: string, patch: { 
    state?: ContactState; 
    addAudience?: AudienceSegment[]; 
    removeAudience?: AudienceSegment[] 
  }) {
    await ensureContactsTaxonomyColumns();
    
    const updates: any[] = [];
    
    if (patch.state) {
      updates.push(sql`state = ${patch.state}`);
    }
    
    if (patch.addAudience || patch.removeAudience) {
      // Get current audience segments
      const current = await db.execute(sql`
        SELECT audience_segments FROM contacts WHERE id = ${id}
      `);
      
      let segments: AudienceSegment[] = [];
      if (current.rows.length > 0) {
        const currentSegments = (current.rows[0] as any).audience_segments;
        segments = JSON.parse(currentSegments || '[]');
      }
      
      // Add new segments
      if (patch.addAudience) {
        for (const segment of patch.addAudience) {
          if (!segments.includes(segment)) {
            segments.push(segment);
          }
        }
      }
      
      // Remove segments
      if (patch.removeAudience) {
        segments = segments.filter(s => !patch.removeAudience!.includes(s));
      }
      
      updates.push(sql`audience_segments = ${JSON.stringify(segments)}`);
    }
    
    if (updates.length > 0) {
      updates.push(sql`updatedAt = NOW()`);
      
      await db.execute(sql`
        UPDATE contacts 
        SET ${sql.join(updates, sql`, `)}
        WHERE id = ${id}
      `);
    }
    
    return { ok: true };
  },

  async bulkUpdate(ids: string[], patch: { 
    state?: ContactState; 
    addAudience?: AudienceSegment[]; 
    removeAudience?: AudienceSegment[] 
  }) {
    if (ids.length === 0) return { ok: true, updated: 0 };
    
    // For bulk updates with audience changes, we need to update each contact individually
    // to properly handle the JSON array operations
    let updated = 0;
    
    for (const id of ids) {
      try {
        await this.updateContact(id, patch);
        updated++;
      } catch (error: unknown) {
        console.error(`Failed to update contact ${id}:`, error);
      }
    }
    
    return { ok: true, updated };
  },

  async idsByFilter(params: { 
    state?: ContactState[]; 
    audience?: AudienceSegment[] 
  }) {
    await ensureContactsTaxonomyColumns();
    
    let query = sql`SELECT id FROM contacts WHERE 1=1`;
    
    if (params.state && params.state.length > 0) {
      query = sql`${query} AND state = ANY(${params.state})`;
    }
    
    if (params.audience && params.audience.length > 0) {
      for (const segment of params.audience) {
        query = sql`${query} AND JSON_EXTRACT(audience_segments, '$') LIKE ${'%"' + segment + '"%'}`;
      }
    }
    
    const result = await db.execute(query);
    return result.rows.map((row: any) => row.id);
  },
};

// GET /api/contacts (filter by state and/or audience)
router.get('/contacts', async (req: any, res: any) => {
  try {
    const state = typeof req.query.state === 'string'
      ? (req.query.state as string).split(',').filter(isContactState) as ContactState[]
      : undefined;

    const audience = typeof req.query.audience === 'string'
      ? (req.query.audience as string).split(',').filter(isAudienceSegment) as AudienceSegment[]
      : undefined;

    const q = (req.query.q as string | undefined) || undefined;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);

    console.log(`🔍 [CONTACTS-TAXONOMY] Filtering contacts - state: ${state?.join(',') || 'all'}, audience: ${audience?.join(',') || 'all'}`);

    const data = await contactsDb.listContacts({ state, audience, q, limit, offset });
    
    console.log(`✅ [CONTACTS-TAXONOMY] Found ${data.items.length} contacts (${data.total} total)`);
    
    return res.json({ ok: true, success: true, ...data });
  } catch (error: unknown) {
    console.error('❌ [CONTACTS-TAXONOMY] Filter failed:', error);
    return res.status(500).json({ ok: false, error: 'Failed to filter contacts' });
  }
});

// PATCH /api/contacts/:id (single record update)
router.patch('/contacts/:id', async (req: any, res: any) => {
  try {
    const { state, addAudience, removeAudience } = req.body || {};
    
    if (state && !isContactState(state)) {
      return res.status(400).json({ ok: false, reason: 'invalid_state' });
    }

    const add = Array.isArray(addAudience) ? addAudience.filter(isAudienceSegment) : undefined;
    const remove = Array.isArray(removeAudience) ? removeAudience.filter(isAudienceSegment) : undefined;

    console.log(`📝 [CONTACTS-TAXONOMY] Updating contact ${req.params.id} - state: ${state || 'unchanged'}, add: ${add?.join(',') || 'none'}, remove: ${remove?.join(',') || 'none'}`);

    const r = await contactsDb.updateContact(req.params.id, { state, addAudience: add, removeAudience: remove });
    
    console.log(`✅ [CONTACTS-TAXONOMY] Contact ${req.params.id} updated`);
    
    return res.json({ ok: true, success: true, ...r });
  } catch (error: unknown) {
    console.error('❌ [CONTACTS-TAXONOMY] Update failed:', error);
    return res.status(500).json({ ok: false, error: 'Failed to update contact' });
  }
});

// POST /api/contacts/bulk (by ids OR by filter)
router.post('/contacts/bulk', async (req: any, res: any) => {
  try {
    const { ids, filter, setState, addAudience, removeAudience } = req.body || {};

    if (setState && !isContactState(setState)) {
      return res.status(400).json({ ok: false, reason: 'invalid_state' });
    }

    const add = Array.isArray(addAudience) ? addAudience.filter(isAudienceSegment) : undefined;
    const remove = Array.isArray(removeAudience) ? removeAudience.filter(isAudienceSegment) : undefined;

    let targetIds: string[] = Array.isArray(ids) ? ids : [];
    
    if (!targetIds.length && filter) {
      const state = Array.isArray(filter.state) ? filter.state.filter(isContactState) : undefined;
      const audience = Array.isArray(filter.audience) ? filter.audience.filter(isAudienceSegment) : undefined;
      targetIds = await contactsDb.idsByFilter({ state, audience });
    }
    
    if (!targetIds.length) {
      return res.status(400).json({ ok: false, reason: 'no_targets' });
    }

    console.log(`🔄 [CONTACTS-TAXONOMY] Bulk update for ${targetIds.length} contacts - state: ${setState || 'unchanged'}, add: ${add?.join(',') || 'none'}, remove: ${remove?.join(',') || 'none'}`);

    const r = await contactsDb.bulkUpdate(targetIds, { state: setState, addAudience: add, removeAudience: remove });
    
    console.log(`✅ [CONTACTS-TAXONOMY] Bulk update completed - ${r.updated} contacts updated`);
    
    return res.json({ ok: true, ...r });
  } catch (error: unknown) {
    console.error('❌ [CONTACTS-TAXONOMY] Bulk update failed:', error);
    return res.status(500).json({ ok: false, error: 'Failed to perform bulk update' });
  }
});

export default router;