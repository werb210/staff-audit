import { pool } from "./pool";
export class TenantRepo {
    // Executes on the request's client (with RLS and role enforcement), fallback to pool
    async run(req, text, params = []) {
        if (req?.pg) {
            // Use the per-request client that has tenant role and GUC set
            const { rows } = await req.pg.query(text, params);
            return rows;
        }
        // Fallback to pool (without tenant isolation - for internal/admin operations only)
        console.warn('Using pool connection without tenant isolation:', text.substring(0, 50));
        const { rows } = await pool.query(text, params);
        return rows;
    }
    // Helper to get single row
    async runOne(req, text, params = []) {
        const rows = await this.run(req, text, params);
        return rows[0] || null;
    }
}
