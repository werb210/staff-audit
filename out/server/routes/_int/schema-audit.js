import { Router } from "express";
import { Pool } from "pg";
import { execSync } from "node:child_process";
import fs from "node:fs";
const r = Router();
const db = new Pool({ connectionString: process.env.DATABASE_URL });
r.get("/api/_int/schema/audit", async (_req, res) => {
    try {
        const result = execSync(`./scripts/audit-schema.sh`, {
            stdio: ["inherit", "pipe", "inherit"],
            env: process.env,
            encoding: 'utf8'
        });
        // Try to read the report file
        try {
            const report = fs.readFileSync("/tmp/schema_audit_report.json", "utf8");
            res.type("application/json").send(report);
        }
        catch (fileErr) {
            // If file doesn't exist, return basic status
            res.json({
                ok: result.includes("Schema audit: PASS"),
                missing_count: 0,
                error: "Report file not found, but script ran successfully"
            });
        }
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});
export default r;
