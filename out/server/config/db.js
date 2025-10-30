// server/config/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { logger } from "../utils/logger"; // assume you have a simple logger
// Use environment variable or fallback to local Postgres
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/boreal_staff";
if (!DATABASE_URL) {
    throw new Error("DATABASE_URL must be set in environment");
}
// Create a connection pool
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// Wrap with Drizzle ORM
export const db = drizzle(pool, {
    logger: {
        log: (msg) => logger.info("db", msg),
        warn: (msg) => logger.warn("db", msg),
        error: (msg) => logger.error("db", msg),
    },
});
// Simple health check function
export async function checkDbConnection() {
    try {
        await pool.query("SELECT 1");
        logger.info("DB connection healthy");
    }
    catch (err) {
        logger.error("DB connection failed", err);
        throw err;
    }
}
// Graceful shutdown (optional but recommended)
export async function closeDb() {
    await pool.end();
}
export default db;
