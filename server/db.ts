import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

// Configure WebSocket for Neon with proper error handling
try {
  neonConfig.webSocketConstructor = ws;
  // Disable automatic query batch processing for better connection stability
  neonConfig.fetchConnectionCache = true;
  neonConfig.useSecureWebSocket = true;
} catch (error) {
  console.warn('WebSocket configuration warning:', error);
  // Fallback to regular HTTP connection if WebSocket fails
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with optimized settings for serverless environments
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduce max connections for serverless
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  connectionTimeoutMillis: 5000, // 5 seconds connection timeout
  allowExitOnIdle: true, // Allow pool to exit when idle
  maxUses: 50 // Limit uses per connection to prevent stale connections
});

// Add SQL tracing for duplicate route debugging (simplified)
if (process.env.TRACE_DUPES === '1') {
  const origQuery = pool.query.bind(pool);
  (pool as any).query = (...args: any[]) => {
    const text = typeof args[0] === 'string' ? args[0] : args[0]?.text;
    if (text) {
      const shortText = text.replace(/\s+/g, ' ').substring(0, 50);
      console.log('[SQL]', shortText);
    }
    return origQuery(...args);
  };
}

// Add error handling for pool events
pool.on('error', (err) => {
  console.error('Database pool error:', err.message || err);
  // Don't exit the process, let the pool handle reconnection
});

pool.on('connect', () => {
  console.log('✅ Database connection established');
});

pool.on('remove', () => {
  console.log('🔄 Database connection removed from pool');
});

// Graceful shutdown handler - only for actual process termination
process.on('SIGINT', async () => {
  console.log('🔄 Gracefully closing database connections...');
  try {
    await pool.end();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
});

// DO NOT end pool on SIGTERM for server restarts - just log
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received - keeping database pool active for restart...');
});

export const db = drizzle({ client: pool, schema });
