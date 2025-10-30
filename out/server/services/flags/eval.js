import { db } from "../../db";
import { sql } from "drizzle-orm";
/* --------- Helpers --------- */
function hashStr(s) {
    // Simple 32-bit FNV-1a-ish hash; deterministic and fast
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
}
function bucket(s) { return hashStr(s) % 10000; } // 0..9999
function pctToThreshold(p) { return Math.max(0, Math.min(100, p)) * 100; }
export function ctxFromReq(req) {
    return {
        userId: req.user?.id || req.session?.user_id || undefined,
        role: req.user?.role || undefined,
        tenantId: req.user?.tenant_id || undefined,
        ip: (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "")
    };
}
/* --------- Flags --------- */
export async function isFlagEnabled(key, ctx) {
    const fr = await db.execute(sql `SELECT key, enabled, rollout_pct FROM feature_flags WHERE key=${key} LIMIT 1`);
    const flag = fr.rows?.[0];
    if (!flag)
        return { value: false, reason: "missing" };
    // Overrides precedence: user > role > tenant > global
    const ovs = (await db.execute(sql `
    SELECT scope, value FROM flag_overrides
     WHERE flag_key=${key}
       AND (
            (scope='user' AND user_id=${ctx.userId || null}) OR
            (scope='role' AND role=${ctx.role || null}) OR
            (scope='tenant' AND tenant_id=${ctx.tenantId || null}) OR
            (scope='global')
       )
  `)).rows || [];
    const by = (s) => ovs.find(o => o.scope === s);
    if (by('user'))
        return { value: !!by('user').value, reason: "override:user" };
    if (by('role'))
        return { value: !!by('role').value, reason: "override:role" };
    if (by('tenant'))
        return { value: !!by('tenant').value, reason: "override:tenant" };
    if (by('global'))
        return { value: !!by('global').value, reason: "override:global" };
    if (!flag.enabled)
        return { value: false, reason: "disabled" };
    // % rollout based on stable bucket of subject (userId||ip)
    const subject = ctx.userId || ctx.ip || "anon";
    const th = pctToThreshold(Number(flag.rollout_pct || 0));
    const on = bucket(`${key}:${subject}`) < th;
    return { value: on, reason: `rollout:${flag.rollout_pct}%` };
}
/* --------- Experiments --------- */
export async function assignExperiment(expKey, ctx) {
    const er = await db.execute(sql `SELECT key, status, allocation_pct, exposure_flag_key FROM experiments WHERE key=${expKey} LIMIT 1`);
    const exp = er.rows?.[0];
    if (!exp)
        return { variant: process.env.FLAGS_DEFAULT_VARIANT || "control", reason: "missing" };
    if (exp.status !== 'running')
        return { variant: process.env.FLAGS_DEFAULT_VARIANT || "control", reason: exp.status };
    // optional gate by flag
    if (exp.exposure_flag_key) {
        const f = await isFlagEnabled(exp.exposure_flag_key, ctx);
        if (!f.value)
            return { variant: process.env.FLAGS_DEFAULT_VARIANT || "control", reason: `flag:${f.reason}` };
    }
    const subject = ctx.userId || ctx.tenantId || ctx.ip || "anon";
    const b = bucket(`${expKey}:${subject}`); // 0..9999
    const alloc = pctToThreshold(Number(exp.allocation_pct || 100));
    if (b >= alloc)
        return { variant: "control", reason: "outside_allocation" };
    // Pull variants and map weights to bucket ranges
    const vr = await db.execute(sql `SELECT variant_key, weight FROM experiment_variants WHERE experiment_key=${expKey} ORDER BY variant_key`);
    const vars = vr.rows || [];
    if (!vars.length)
        return { variant: "control", reason: "no_variants" };
    const total = vars.reduce((s, v) => s + Number(v.weight || 0), 0) || 100;
    let acc = 0;
    for (const v of vars) {
        const next = acc + Math.floor((Number(v.weight || 0) / total) * alloc);
        if (b >= acc && b < next)
            return { variant: v.variant_key, reason: `bucket:${b}/${alloc}` };
        acc = next;
    }
    return { variant: vars[0].variant_key, reason: "fallback_first" };
}
