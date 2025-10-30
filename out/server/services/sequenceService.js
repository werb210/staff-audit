import { pool } from "../db";
export async function createSequence(name, owner_id) {
    const res = await pool.query("INSERT INTO sequences (name, owner_id) VALUES ($1,$2) RETURNING *", [name, owner_id]);
    return res.rows[0];
}
export async function addStep(sequenceId, type, content, delay, order) {
    const res = await pool.query("INSERT INTO sequence_steps (sequence_id,type,content,delay_hours,step_order) VALUES ($1,$2,$3,$4,$5) RETURNING *", [sequenceId, type, content, delay, order]);
    return res.rows[0];
}
export async function importProspects(sequenceId, prospects) {
    const inserted = [];
    for (const p of prospects) {
        const res = await pool.query("INSERT INTO prospects (sequence_id,name,title,profile_url) VALUES ($1,$2,$3,$4) RETURNING *", [sequenceId, p.name, p.title, p.profile_url]);
        inserted.push(res.rows[0]);
    }
    return inserted;
}
export async function runSequence(sequenceId) {
    // Stub implementation - would process steps and update logs
    console.log(`[Sequences] Running sequence ${sequenceId}`);
    return { ok: true, message: "Sequence executed" };
}
