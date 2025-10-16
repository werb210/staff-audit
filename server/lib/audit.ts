import { db } from "../db";
import { sql } from "drizzle-orm";

export async function audit(
  rid: string, 
  tenant: string, 
  sub: string | null, 
  action: string, 
  entity?: string, 
  entityId?: string, 
  meta: any = {}
) {
  try {
    await db.execute(sql`
      INSERT INTO audit_logs(rid, tenant, sub, action, entity, entity_id, meta) 
      VALUES(${rid}, ${tenant}, ${sub}, ${action}, ${entity || null}, ${entityId || null}, ${JSON.stringify(meta)})
    `);
  } catch (error) {
    console.error("[AUDIT] Failed to write audit log:", error);
    // Don't throw - audit failures shouldn't break the main flow
  }
}

export async function auditAIAction(
  rid: string,
  tenant: string, 
  userId: string | null,
  aiAction: string,
  applicationId: string,
  result: any,
  durationMs: number,
  tokens?: number
) {
  await audit(rid, tenant, userId, "ai_action", "application", applicationId, {
    ai_action: aiAction,
    duration_ms: durationMs,
    tokens_used: tokens,
    success: !!result,
    timestamp: new Date().toISOString()
  });
}