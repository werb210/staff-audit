import { pool } from "./pool";

export class TenantRepo {
  // Executes on the request's client (with RLS and role enforcement), fallback to pool
  protected async run<T = any>(req: any, text: string, params: any[] = []) {
    if (req?.pg) {
      // Use the per-request client that has tenant role and GUC set
      const { rows } = await req.pg.query(text, params);
      return rows as T[];
    }
    
    // Fallback to pool (without tenant isolation - for internal/admin operations only)
    console.warn('Using pool connection without tenant isolation:', text.substring(0, 50));
    const { rows } = await pool.query(text, params);
    return rows as T[];
  }
  
  // Helper to get single row
  protected async runOne<T = any>(req: any, text: string, params: any[] = []): Promise<T | null> {
    const rows = await this.run<T>(req, text, params);
    return rows[0] || null;
  }
}