import { Router } from "express";
// REMOVED: requirePermission from authz service (authentication system deleted)
import { db } from "../../db";
import { sql } from "drizzle-orm";
import archiver from "archiver";
import crypto from "crypto";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
const router = Router();
/* 2FA Setup and Management */
router.post("/2fa/setup", async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    // Generate secret
    const secret = speakeasy.generateSecret({
        issuer: process.env.TOTP_ISSUER || 'StaffApp',
        name: req.user.email,
        length: 32
    });
    // Store temporary secret (not enabled yet)
    await db.execute(sql `
    UPDATE users 
    SET totp_secret = ${secret.base32}, totp_enabled = false 
    WHERE id = ${userId}
  `);
    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');
    res.json({
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32
    });
});
router.post("/2fa/verify", async (req, res) => {
    const userId = req.user?.id;
    const { token } = req.body || {};
    if (!userId || !token) {
        return res.status(400).json({ error: "Missing user ID or token" });
    }
    // Get user's secret
    const user = (await db.execute(sql `
    SELECT totp_secret FROM users WHERE id = ${userId}
  `)).rows?.[0];
    if (!user?.totp_secret) {
        return res.status(400).json({ error: "2FA not set up" });
    }
    // Verify token
    const verified = speakeasy.totp.verify({
        secret: user.totp_secret,
        encoding: 'base32',
        token,
        window: 1
    });
    if (verified) {
        // Enable 2FA
        await db.execute(sql `
      UPDATE users SET totp_enabled = true WHERE id = ${userId}
    `);
        res.json({ ok: true, message: "2FA enabled successfully" });
    }
    else {
        res.status(400).json({ error: "Invalid token" });
    }
});
router.post("/2fa/disable", async (req, res) => {
    const userId = req.user?.id;
    const { token } = req.body || {};
    if (!userId || !token) {
        return res.status(400).json({ error: "Missing user ID or token" });
    }
    // Get user's secret
    const user = (await db.execute(sql `
    SELECT totp_secret FROM users WHERE id = ${userId}
  `)).rows?.[0];
    if (!user?.totp_secret) {
        return res.status(400).json({ error: "2FA not enabled" });
    }
    // Verify token before disabling
    const verified = speakeasy.totp.verify({
        secret: user.totp_secret,
        encoding: 'base32',
        token,
        window: 1
    });
    if (verified) {
        await db.execute(sql `
      UPDATE users 
      SET totp_secret = null, totp_enabled = false 
      WHERE id = ${userId}
    `);
        res.json({ ok: true, message: "2FA disabled successfully" });
    }
    else {
        res.status(400).json({ error: "Invalid token" });
    }
});
/* Secrets Management */
router.get("/secrets", async (req, res) => {
    const secrets = await db.execute(sql `
    SELECT name, version, last_rotated_at, notes 
    FROM secrets_registry 
    ORDER BY name
  `);
    res.json(secrets.rows || []);
});
router.post("/secrets/:name/rotate", async (req, res) => {
    const { name } = req.params;
    const { notes } = req.body || {};
    await db.execute(sql `
    INSERT INTO secrets_registry (name, version, last_rotated_at, notes)
    VALUES (${name}, 1, now(), ${notes})
    ON CONFLICT (name) DO UPDATE SET
      version = secrets_registry.version + 1,
      last_rotated_at = now(),
      notes = ${notes}
  `);
    // Log the rotation
    await db.execute(sql `
    INSERT INTO audit_log (actor_user_id, action, resource_type, resource_id, meta)
    VALUES (${req.user?.id}, 'secret_rotated', 'secret', ${name}, ${JSON.stringify({ notes })})
  `);
    res.json({ ok: true });
});
/* Audit Export */
router.post("/audit/export", async (req, res) => {
    const { startDate, endDate, types } = req.body || {};
    try {
        // Build query based on filters
        let whereClause = "WHERE 1=1";
        const params = [];
        let paramIndex = 0;
        if (startDate) {
            whereClause += ` AND createdAt >= $${++paramIndex}`;
            params.push(startDate);
        }
        if (endDate) {
            whereClause += ` AND createdAt <= $${++paramIndex}`;
            params.push(endDate);
        }
        if (types && types.length > 0) {
            const placeholders = types.map(() => `$${++paramIndex}`).join(',');
            whereClause += ` AND action IN (${placeholders})`;
            params.push(...types);
        }
        // Get audit logs
        const auditLogs = await db.execute(sql.raw(`
      SELECT al.*, u.email as actor_email
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.actor_user_id
      ${whereClause}
      ORDER BY al.createdAt DESC
      LIMIT 10000
    `, params));
        // Create archive
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-export.zip');
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);
        // Convert to CSV
        const csvHeader = 'ID,Actor Email,Action,Resource Type,Resource ID,Meta,Created At\n';
        let csvContent = csvHeader;
        for (const log of auditLogs.rows || []) {
            const row = [
                log.id,
                log.actor_email || '',
                log.action,
                log.resource_type || '',
                log.resource_id || '',
                JSON.stringify(log.meta || {}),
                log.createdAt
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
            csvContent += row + '\n';
        }
        archive.append(csvContent, { name: 'audit_logs.csv' });
        // Add metadata
        const metadata = {
            exportedAt: new Date().toISOString(),
            exportedBy: req.user?.email,
            filters: { startDate, endDate, types },
            totalRecords: auditLogs.rows?.length || 0,
            signature: crypto
                .createHmac('sha256', process.env.AUDIT_EXPORT_SIGNING_SECRET || (() => {
                throw new Error('AUDIT_EXPORT_SIGNING_SECRET environment variable is required');
            })())
                .update(csvContent)
                .digest('hex')
        };
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
        archive.finalize();
    }
    catch (error) {
        console.error('Audit export error:', error);
        res.status(500).json({ error: 'Export failed' });
    }
});
/* Document Security Check */
router.post("/documents/:id/av-check", async (req, res) => {
    const { id } = req.params;
    // Update status to pending
    await db.execute(sql `
    UPDATE documents 
    SET av_status = 'pending', av_checked_at = now()
    WHERE id = ${id}
  `);
    // Mock AV scan (in production, this would connect to ClamAV)
    const isMockInfected = Math.random() < 0.01; // 1% chance of "infection" for testing
    const status = isMockInfected ? 'infected' : 'clean';
    // Update with results
    await db.execute(sql `
    UPDATE documents 
    SET av_status = ${status}, av_checked_at = now()
    WHERE id = ${id}
  `);
    // Log the scan
    await db.execute(sql `
    INSERT INTO audit_log (actor_user_id, action, resource_type, resource_id, meta)
    VALUES (${req.user?.id}, 'av_scan', 'document', ${id}, ${JSON.stringify({ status })})
  `);
    res.json({ ok: true, status });
});
/* Compliance Dashboard */
router.get("/compliance/dashboard", async (req, res) => {
    const stats = {
        documents: {
            total: 0,
            scanned: 0,
            clean: 0,
            infected: 0,
            pending: 0
        },
        users: {
            total: 0,
            with2fa: 0
        },
        secrets: {
            total: 0,
            rotatedThisMonth: 0
        }
    };
    // Document stats
    const docStats = (await db.execute(sql `
    SELECT 
      COUNT(*) as total,
      COUNT(av_status) as scanned,
      COUNT(CASE WHEN av_status='clean' THEN 1 END) as clean,
      COUNT(CASE WHEN av_status='infected' THEN 1 END) as infected,
      COUNT(CASE WHEN av_status='pending' THEN 1 END) as pending
    FROM documents
  `)).rows?.[0];
    if (docStats) {
        stats.documents = docStats;
    }
    // User 2FA stats
    const userStats = (await db.execute(sql `
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN totp_enabled=true THEN 1 END) as with2fa
    FROM users
  `)).rows?.[0];
    if (userStats) {
        stats.users = userStats;
    }
    // Secrets stats
    const secretStats = (await db.execute(sql `
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN last_rotated_at > date_trunc('month', now()) THEN 1 END) as rotatedThisMonth
    FROM secrets_registry
  `)).rows?.[0];
    if (secretStats) {
        stats.secrets = secretStats;
    }
    res.json(stats);
});
export default router;
