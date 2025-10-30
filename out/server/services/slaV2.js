const q = pool.query.bind(pool);
import { pool } from "../db/pool";
const tz = process.env.TIMEZONE || "America/Edmonton";
function minutes(n) { return n * 60 * 1000; }
export async function ensureDefaultPolicies() {
    // idempotent upserts for first response and max unread
    await q(`
    INSERT INTO sla_policies(name, applies_to, target_minutes, active)
    VALUES ('First Response', 'thread', $1, true)
    ON CONFLICT DO NOTHING
  `, [Number(process.env.SLA_FIRST_RESPONSE_MINUTES || 15)]);
    await q(`
    INSERT INTO sla_policies(name, applies_to, target_minutes, active)
    VALUES ('Max Unread', 'thread', $1, true)
    ON CONFLICT DO NOTHING
  `, [Number(process.env.SLA_MAX_UNREAD_MINUTES || 60)]);
}
export async function onInboundMessage(threadId) {
    // create/refresh SLAs for the thread
    const policies = await q(`SELECT id, name, target_minutes FROM sla_policies WHERE active=true`);
    const now = new Date();
    for (const p of policies) {
        const due = new Date(now.getTime() + minutes(Number(p.target_minutes || 15)));
        // upsert thread_slas row
        await q(`
      INSERT INTO thread_slas(thread_id, policy_id, due_at, status)
      VALUES ($1, $2, $3, 'ok')
      ON CONFLICT DO NOTHING
    `, [threadId, p.id, due]);
        await q(`UPDATE comm_threads SET sla_due_at=$1, sla_status='ok' WHERE id=$2`, [due, threadId]);
    }
}
export async function onOutboundMessage(threadId) {
    // satisfy first-response SLA if pending
    await q(`
    UPDATE thread_slas SET satisfied_at=now(), status='done'
    WHERE thread_id=$1 AND satisfied_at IS NULL AND breached_at IS NULL
  `, [threadId]);
    await q(`UPDATE comm_threads SET sla_status='ok' WHERE id=$1`, [threadId]);
}
export async function evaluateSlasTick() {
    const now = new Date();
    const r = await q(`
    SELECT ts.id, ts.thread_id, ts.due_at, ts.status
    FROM thread_slas ts
    JOIN comm_threads t ON t.id = ts.thread_id
    WHERE ts.satisfied_at IS NULL AND ts.breached_at IS NULL AND (t.snooze_until IS NULL OR t.snooze_until < now()) AND t.muted=false
  `);
    for (const row of r) {
        if (now > new Date(row.due_at)) {
            await q(`UPDATE thread_slas SET breached_at=now(), status='breached' WHERE id=$1`, [row.id]);
            await q(`UPDATE comm_threads SET sla_status='breached' WHERE id=$1`, [row.thread_id]);
            // TODO: notify escalation target via activity log or WS
        }
        else {
            await q(`UPDATE comm_threads SET sla_status='ok' WHERE id=$1`, [row.thread_id]);
        }
    }
}
