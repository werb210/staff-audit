import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  max: 10, 
  idleTimeoutMillis: 30000 
});

// Add SQL logging for tracing when TRACE_DUPES=1
if (process.env.TRACE_DUPES === '1') {
  const origQuery = pool.query.bind(pool);
  (pool as any).query = (...args: any[]) => {
    const text = typeof args[0] === 'string' ? args[0] : args[0]?.text;
    if (text) {
      console.log('[SQL]', text.replace(/\s+/g, ' ').trim());
    }
    return origQuery(...args);
  };
}

// Add error handling for pool events
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

pool.on('connect', () => {
  console.log('✅ Database connection established');
});

export const db = drizzle(pool, { schema });

// handy helper
export async function withTx<T>(fn:(tx:any)=>Promise<T>) {
  // @ts-ignore
  return await db.transaction(async (tx:any)=> fn(tx));
}