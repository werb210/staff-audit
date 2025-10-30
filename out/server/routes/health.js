import express from 'express';
import { listJobs } from "../services/scheduler";
export default function healthRoutes() {
    const r = express.Router();
    r.get('/healthz', (_req, res) => res.type('text/plain').send('ok'));
    r.get('/readyz', (_req, res) => res.json({ ok: true, ts: Date.now() }));
    r.get('/api/health', (_req, res) => res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'boreal-financial-api',
        version: '1.0.0'
    }));
    // Enhanced health check with system status (moved to /api/health/status to avoid blocking root)
    r.get('/api/health/status', async (_req, res) => {
        const checks = {};
        try {
            // DB check
            checks.db = process.env.DATABASE_URL ? "configured" : "missing";
            // Twilio check
            checks.twilio = {
                accountSid: process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) + "..." || "not-set",
                verifyService: process.env.TWILIO_VERIFY_SERVICE_SID?.substring(0, 8) + "..." || "not-set",
                bfConfigured: !!process.env.TWILIO_ACCOUNT_SID_BF,
                slfConfigured: !!process.env.TWILIO_ACCOUNT_SID_SLF
            };
            // LinkedIn check (optional)
            checks.linkedin = {
                clientId: process.env.LINKEDIN_CLIENT_ID ? "set" : "missing",
                clientSecret: process.env.LINKEDIN_CLIENT_SECRET ? "set" : "missing"
            };
            // Jobs
            checks.jobs = listJobs();
            // Sequences
            checks.sequences = {
                cronEnabled: true,
                schedule: process.env.SEQUENCE_CRON || "*/5 * * * *"
            };
            res.json({ ok: true, checks });
        }
        catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });
    return r;
}
