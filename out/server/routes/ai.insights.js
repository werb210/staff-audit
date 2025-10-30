import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
const r = Router();
// Grouped insights + conflicts + risk score
r.get("/ai/insights/:applicationId", async (req, res) => {
    const appId = req.params.applicationId;
    // Pull document meta (assumed captured elsewhere)
    const { rows: docs } = await db.execute(sql `select id, category, status, name, version from documents where applicationId=${appId}`);
    const { rows: tx } = await db.execute(sql `select posted_at, amount_cents, type from bank_tx where applicationId=${appId} order by posted_at desc limit 500`);
    const groups = groupDocs(docs || []);
    const banking = computeBanking(tx || []);
    const conflicts = findConflicts(groups);
    const risk = scoreRisk(groups, banking);
    res.json({ ok: true, groups, banking, conflicts, risk });
});
function groupDocs(docs) {
    const cats = ["BS", "IS", "CF", "Taxes", "Contracts", "Invoices"];
    const out = {};
    for (const c of cats)
        out[c] = [];
    for (const d of docs) {
        (out[d.category] ||= []).push({ id: d.id, name: d.name, status: d.status, v: d.version });
    }
    return out;
}
function computeBanking(tx) {
    const last90 = tx.filter((t) => (Date.now() - new Date(t.posted_at).getTime()) < 90 * 864e5);
    const inflow = last90.filter((t) => t.amount_cents > 0).reduce((a, b) => a + b.amount_cents, 0);
    const outflow = last90.filter((t) => t.amount_cents < 0).reduce((a, b) => a + Math.abs(b.amount_cents), 0);
    const nsf = last90.filter((t) => (t.type || "").toLowerCase() === "nsf").length;
    const avgBal = (inflow - outflow) / 3; // naive monthly average
    return { inflow_cents: inflow, outflow_cents: outflow, nsf_90d: nsf, avg_balance_cents: Math.round(avgBal) };
}
function findConflicts(groups) {
    // Simple heuristic: missing pairs (e.g., IS without BS) or inconsistent versioning
    const conflicts = [];
    if ((groups.IS?.length || 0) > 0 && (groups.BS?.length || 0) === 0)
        conflicts.push({ field: "Statements", issue: "Income Statement present but no Balance Sheet" });
    return conflicts;
}
function scoreRisk(groups, banking) {
    let s = 50;
    if ((groups.Taxes?.length || 0) === 0)
        s += 15;
    if (banking.nsf_90d > 1)
        s += 20;
    if (banking.avg_balance_cents < 0)
        s += 10;
    return Math.min(100, Math.max(0, s));
}
export default r;
