import { Pool, type PoolConfig, type QueryResult } from 'pg';
let _pool: Pool | null = null;
export function getDB(): Pool | null {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL || '';
  if (!url) return null;
  const ssl = /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false };
  const cfg: PoolConfig = { connectionString: url, ssl };
  _pool = new Pool(cfg);
  return _pool;
}
export async function q(sql: string, params: any[] = []): Promise<QueryResult | null> {
  const db = getDB(); if (!db) return null;
  try { return await db.query(sql, params); }
  catch (e:any) {
    (globalThis as any).__DB_LAST_ERROR__ = String(e?.message||e);
    return null;
  }
}
export function lastDbError(): string {
  return String((globalThis as any).__DB_LAST_ERROR__||'');
}