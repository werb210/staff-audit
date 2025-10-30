import { db } from "../../db";
import { sql } from "drizzle-orm";
const DEFAULT_TENANT = "default";
async function postSlack(message) {
    const webhook = process.env.ALERTS_SLACK_WEBHOOK;
    if (!webhook)
        return;
    try {
        const response = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message })
        });
        if (!response.ok) {
            console.error('Failed to send Slack alert:', response.statusText);
        }
    }
    catch (error) {
        console.error('Error sending Slack alert:', error);
    }
}
export async function getCurrentPlan(tenant = DEFAULT_TENANT) {
    const r = await db.execute(sql `
    SELECT p.key, p.name, p.monthly_price_cents, p.limits
      FROM subscriptions s
      JOIN billing_plans p ON p.key=s.plan_key
     WHERE s.tenant_key=${tenant} AND s.canceled_at IS NULL
     LIMIT 1
  `);
    const row = r.rows?.[0];
    return {
        key: row?.key || "team",
        name: row?.name || "Team",
        limits: row?.limits || {},
        price_cents: Number(row?.monthly_price_cents || 0)
    };
}
function monthStart(d = new Date()) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
function parseThresholds() {
    const raw = String(process.env.BILLING_ALERT_THRESHOLDS || "0.8,1.0");
    return raw.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
}
export async function summary(tenant = DEFAULT_TENANT) {
    const plan = await getCurrentPlan(tenant);
    const period = monthStart();
    const r = await db.execute(sql `SELECT metric, value FROM usage_counters WHERE tenant_key=${tenant} AND period_start=${period}`);
    const used = {};
    for (const row of (r.rows || []))
        used[row.metric] = Number(row.value || 0);
    const limits = plan.limits || {};
    const out = [];
    for (const [metric, limit] of Object.entries(limits)) {
        const u = used[metric] || 0;
        out.push({ metric, used: u, limit: Number(limit || 0), pct: limit ? Math.min(1, u / Number(limit)) : null });
    }
    return { tenant, period: period.toISOString().slice(0, 10), plan: plan.key, limits, usage: out };
}
async function ensureCounter(tenant, metric, period) {
    await db.execute(sql `
    INSERT INTO usage_counters(tenant_key, metric, period_start, value)
    VALUES (${tenant}, ${metric}, ${period}, 0)
    ON CONFLICT (tenant_key, metric, period_start) DO NOTHING
  `);
}
export async function meter(opts) {
    if (String(process.env.BILLING_ENABLED || "true").toLowerCase() !== "true")
        return { ok: true, disabled: true };
    const tenant = opts.tenant || DEFAULT_TENANT;
    const metric = opts.metric;
    const qty = Math.max(1, Math.floor(Number(opts.qty || 1)));
    const period = monthStart();
    await ensureCounter(tenant, metric, period);
    await db.execute(sql `
    UPDATE usage_counters
       SET value = value + ${qty}::bigint, updatedAt = now()
     WHERE tenant_key=${tenant} AND metric=${metric} AND period_start=${period}
  `);
    await db.execute(sql `
    INSERT INTO usage_events(tenant_key, metric, qty, ref_type, ref_id, meta)
    VALUES (${tenant}, ${metric}, ${qty}, ${opts.ref_type || null}, ${opts.ref_id || null}, ${opts.meta || null})
  `);
    // Check thresholds for this metric
    try {
        const plan = await getCurrentPlan(tenant);
        const limit = Number((plan.limits || {})[metric] || 0);
        if (limit > 0) {
            const cur = await db.execute(sql `SELECT value FROM usage_counters WHERE tenant_key=${tenant} AND metric=${metric} AND period_start=${period}`);
            const used = Number(cur.rows?.[0]?.value || 0);
            const pct = used / limit;
            const thresholds = parseThresholds();
            // Determine if we just crossed a threshold
            const prior = Math.max(0, (used - qty) / limit);
            const crossed = thresholds.find(t => prior < t && pct >= t);
            if (crossed != null && process.env.ALERTS_SLACK_WEBHOOK) {
                const pctStr = Math.round(crossed * 100);
                postSlack(`:triangular_flag_on_post: *${metric}* usage crossed *${pctStr}%* on plan *${plan.name}* (${used}/${limit})`);
            }
            // Enforce hard cap at 100% for certain metrics
            if (pct > 1.0 && ["api_calls", "ocr_pages", "sms", "doc_uploads"].includes(metric)) {
                return { ok: false, over_limit: true, metric, used, limit };
            }
        }
    }
    catch { /* non-fatal */ }
    return { ok: true };
}
