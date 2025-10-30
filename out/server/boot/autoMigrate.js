import { pool } from "../db/pool";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export async function runAutoMigrations() {
    const dir = path.resolve(__dirname, "../db/migrations");
    try {
        await pool.query(`create table if not exists _migrations (name text primary key, applied_at timestamptz default now())`);
    }
    catch { }
    let files = [];
    try {
        files = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
    }
    catch {
        return;
    }
    const applied = new Set();
    try {
        const res = await pool.query(`select name from _migrations`);
        for (const r of res.rows)
            applied.add(r.name);
    }
    catch { }
    for (const f of files) {
        if (applied.has(f))
            continue;
        const sql = fs.readFileSync(path.join(dir, f), "utf8");
        try {
            await pool.query("begin");
            await pool.query(sql);
            await pool.query(`insert into _migrations(name) values ($1)`, [f]);
            await pool.query("commit");
            // eslint-disable-next-line no-console
            console.log("[migrate] applied", f);
        }
        catch (e) {
            await pool.query("rollback");
            console.error("[migrate] failed", f, e);
            throw e;
        }
    }
}
