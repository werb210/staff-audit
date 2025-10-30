import { db } from "../db";
import { sql } from "drizzle-orm";
import { verifyShareToken } from "../services/lender/jwt";
export async function lenderAuth(req, res, next) {
    const token = String(req.query.token || req.headers["x-lender-token"] || "");
    if (!token)
        return res.status(401).json({ error: "missing token" });
    const data = verifyShareToken(token);
    if (!data)
        return res.status(401).json({ error: "invalid token" });
    const r = await db.execute(sql `SELECT id, applicationId, partner_id, perms, expires_at, revoked_at, disabled FROM app_lender_shares WHERE token=${token} LIMIT 1`);
    const share = r.rows?.[0];
    if (!share)
        return res.status(401).json({ error: "share not found" });
    if (share.disabled || share.revoked_at)
        return res.status(401).json({ error: "share revoked" });
    if (new Date(share.expires_at).getTime() < Date.now())
        return res.status(401).json({ error: "share expired" });
    req.lender = { shareId: share.id, applicationId: share.applicationId, partnerId: share.partner_id, perms: share.perms, token };
    await db.execute(sql `UPDATE app_lender_shares SET last_access_at=now() WHERE id=${share.id}`);
    next();
}
export async function lenderAudit(req, event, meta = {}) {
    try {
        const ip = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "");
        const ua = String(req.headers["user-agent"] || "");
        await db.execute(sql `
      INSERT INTO lender_activity(share_id, partner_id, applicationId, event, meta, ip, ua)
      VALUES (${req.lender?.shareId || null}, ${req.lender?.partnerId || null}, ${req.lender?.applicationId || null}, ${event}, ${JSON.stringify(meta)}, ${ip}, ${ua})
    `);
    }
    catch { }
}
