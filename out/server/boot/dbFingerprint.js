import { pool } from "../db/drizzle.js";
export async function assertDbFingerprint() {
    const r = await pool.query(`SELECT current_database() db, inet_server_addr()::text host`);
    const { db, host } = r.rows[0] || {};
    if (process.env.DB_EXPECTED_NAME && db !== process.env.DB_EXPECTED_NAME)
        throw new Error(`DB name mismatch: ${db}`);
    if (process.env.DB_EXPECTED_HOST && host !== process.env.DB_EXPECTED_HOST)
        throw new Error(`DB host mismatch: ${host}`);
}
