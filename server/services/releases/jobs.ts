import { db } from "../../db";
import { sql } from "drizzle-orm";

/**
 * Register whitelisted post-deploy jobs here.
 * Each job receives { releaseId } and may perform safe maintenance.
 */
export const Jobs: Record<string, (args:{releaseId:string}) => Promise<any>> = {
  "recompute-pipeline-counters": async (_a)=>{
    // Example: recompute lightweight counters (idempotent)
    await db.execute(sql`/* no-op placeholder */ SELECT 1`);
    return { ok:true };
  },
  "backfill-trace-variants": async (_a)=>{
    try {
      await db.execute(sql`
        UPDATE decision_traces
           SET variant = COALESCE(variant, ${process.env.ENGINE_VARIANT_DEFAULT || "prod"})
         WHERE variant IS NULL
      `);
    } catch {/* table might not exist; ignore */}
    return { ok:true };
  },
  "reindex-search": async (_a)=>{
    // Placeholder for a future search reindexer
    await db.execute(sql`/* reindex placeholder */ SELECT 1`);
    return { ok:true };
  },
};

export type JobKey = keyof typeof Jobs;