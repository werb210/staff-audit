import { Pool } from "pg";
const db = new Pool({ connectionString: process.env.DATABASE_URL });
export function mountDiagnostics(app) {
    app.get("/_int/dialer/diag", async (_, res) => {
        const issues = [];
        if (!process.env.TWILIO_ACCOUNT_SID)
            issues.push("BF Twilio missing");
        res.json({
            ok: issues.length === 0,
            wsAuth: "helper-installed",
            twilio: { bf: !!process.env.TWILIO_ACCOUNT_SID, configured: !!process.env.TWILIO_VERIFY_SERVICE_SID },
            issues,
        });
    });
    app.get("/_int/auth/first-signin/diag", (_, res) => {
        res.json({ ok: true, magicLink: !!process.env.SENDGRID_API_KEY, notes: "SendGrid required to send first-signin links" });
    });
    app.get("/_int/schema/audit", async (_, res) => {
        try {
            const { rows } = await db.query("select 1 as ok");
            res.json({ ok: rows?.[0]?.ok === 1, problems: [] });
        }
        catch (e) {
            res.json({ ok: false, problems: [e.message] });
        }
    });
}
