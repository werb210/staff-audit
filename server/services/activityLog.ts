import { pool } from "../db/pool";
const q = pool.query.bind(pool);
import { publish } from "../realtime/hub";

export async function logContactActivity({
  contactId, type, direction, title, body, meta
}:{
  contactId: string; type: 'sms'|'email'|'call';
  direction: 'in'|'out'; title?: string; body?: string; meta?: any;
}) {
  const [row] = await q<{ id: string; createdAt: string }>(`
    INSERT INTO contact_activity (contact_id, type, direction, title, body, meta)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, createdAt
  `, [contactId, type, direction, title ?? null, body ?? null, meta ? JSON.stringify(meta) : null]);

  // Push live to any subscribers of the contact
  publish(`contact:${contactId}`, { 
    kind: "activity", 
    type, 
    direction, 
    title, 
    body, 
    meta, 
    id: row.id, 
    createdAt: row.createdAt 
  });
  
  return row;
}