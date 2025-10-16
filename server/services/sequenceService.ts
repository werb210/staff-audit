import { pool } from "../db";

export async function createSequence(name: string, owner_id: string) {
  const res = await pool.query(
    "INSERT INTO sequences (name, owner_id) VALUES ($1,$2) RETURNING *",
    [name, owner_id]
  );
  return res.rows[0];
}

export async function addStep(sequenceId: string, type: string, content: string, delay: number, order: number) {
  const res = await pool.query(
    "INSERT INTO sequence_steps (sequence_id,type,content,delay_hours,step_order) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [sequenceId, type, content, delay, order]
  );
  return res.rows[0];
}

export async function importProspects(sequenceId: string, prospects: {name:string,title:string,profile_url:string}[]) {
  const inserted: any[] = [];
  for (const p of prospects) {
    const res = await pool.query(
      "INSERT INTO prospects (sequence_id,name,title,profile_url) VALUES ($1,$2,$3,$4) RETURNING *",
      [sequenceId, p.name, p.title, p.profile_url]
    );
    inserted.push(res.rows[0]);
  }
  return inserted;
}

export async function runSequence(sequenceId: string) {
  // Stub implementation - would process steps and update logs
  console.log(`[Sequences] Running sequence ${sequenceId}`);
  return { ok: true, message: "Sequence executed" };
}
