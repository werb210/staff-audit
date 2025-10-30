import { Router } from "express";
import { db } from "../db";
const r = Router();
const REQUIRED = [
    { table: "lenders", cols: ["id", "company_name", "email", "phone", "website", "min_loan_amount", "max_loan_amount", "is_active"] }
];
r.get("/schema-check", async (_req, res) => {
    try {
        const issues = [];
        for (const spec of REQUIRED) {
            const cols = await db.execute(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = '${spec.table}'
      `);
            const have = new Set(cols.rows.map((c) => c.column_name));
            const missing = spec.cols.filter(c => !have.has(c));
            if (missing.length)
                issues.push({ table: spec.table, missing });
        }
        res.json({ ok: issues.length === 0, issues });
    }
    catch (error) {
        console.error('Schema check error:', error);
        res.json({ ok: false, error: 'Failed to check schema' });
    }
});
export default r;
