#!/usr/bin/env node
import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

try {
  await client.connect();
  const result = await client.query("SELECT NOW() AS current_time");
  console.log("✅ Database connection OK:", result.rows[0]?.current_time ?? "unknown");
  process.exit(0);
} catch (error) {
  console.error("❌ DB check failed:", error?.message ?? error);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
