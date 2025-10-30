import { Pool } from 'pg';
let _pool = null;
export function getDB() {
    if (_pool)
        return _pool;
    const url = process.env.DATABASE_URL || '';
    if (!url)
        return null;
    const ssl = /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false };
    const cfg = { connectionString: url, ssl };
    _pool = new Pool(cfg);
    return _pool;
}
export async function q(sql, params = []) {
    const db = getDB();
    if (!db)
        return null;
    try {
        return await db.query(sql, params);
    }
    catch (e) {
        globalThis.__DB_LAST_ERROR__ = String(e?.message || e);
        return null;
    }
}
export function lastDbError() {
    return String(globalThis.__DB_LAST_ERROR__ || '');
}
