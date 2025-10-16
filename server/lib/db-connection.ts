import type { PoolConfig } from 'pg';
let _pool: any = null;
export function getDB() {
  if (_pool) {
    console.log('🟢 [DB] Returning existing pool connection');
    return _pool;
  }
  const url = process.env.DATABASE_URL || '';
  console.log('🔵 [DB] DATABASE_URL exists:', !!url, 'length:', url.length);
  if (!url) {
    console.log('🔴 [DB] No DATABASE_URL found');
    return null;
  }
  try {
    const { Pool } = require('pg');
    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    const cfg: PoolConfig = { 
      connectionString: url, 
      ssl: isLocal ? undefined : { rejectUnauthorized: false } 
    };
    console.log('🔵 [DB] Creating new pool with SSL:', !isLocal);
    _pool = new Pool(cfg);
    console.log('🟢 [DB] Pool created successfully');
    return _pool;
  } catch (e) {
    console.log('🔴 [DB] Pool creation failed:', e?.message);
    return null;
  }
}
export async function probe(query: string) {
  const db = getDB(); if (!db) return { ok:false, error:'no-db' };
  try {
    const r = await db.query(query);
    return { ok:true, rows:r.rows, count:r.rowCount };
  } catch (e:any) {
    return { ok:false, error:e?.message||'query-failed' };
  }
}