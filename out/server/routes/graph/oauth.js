import { Router } from "express";
import { msal, saveTokens } from "../../services/graphAuth";
import { db } from "../../db";
import { graphTokens } from "../../db/schema/graphTokens";
import { eq } from "drizzle-orm";
const router = Router();
const SCOPES = (process.env.O365_SCOPES || "").split(" ").filter(Boolean);
const REDIRECT = process.env.O365_REDIRECT_URI;
// Begin OAuth
router.get("/connect", async (_req, res) => {
    const url = await msal.getAuthCodeUrl({ scopes: SCOPES, redirectUri: REDIRECT, prompt: "select_account" });
    res.redirect(url);
});
// Callback
router.get("/callback", async (req, res) => {
    const code = String(req.query.code || "");
    const result = await msal.acquireTokenByCode({ code, scopes: SCOPES, redirectUri: REDIRECT });
    if (!result?.accessToken)
        return res.status(400).send("Auth failed");
    const userId = req.user?.id || req.session?.user?.id; // use your auth context
    if (!userId)
        return res.status(401).send("No session");
    const expiresOn = result.expiresOn ?? new Date(Date.now() + 55 * 60 * 1000);
    await saveTokens(userId, result.accessToken, result.refreshToken, expiresOn, (result.scopes || []).join(" "));
    res.send("<script>window.close && window.close();location='/settings/integrations?graph=connected';</script>");
});
// Status
router.get("/status", async (req, res) => {
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId)
        return res.json({ connected: false });
    const rows = await db.select().from(graphTokens).where(eq(graphTokens.userId, userId));
    if (!rows.length)
        return res.json({ connected: false });
    res.json({ connected: !!rows[0].accessToken, expiresAt: rows[0].expiresAt });
});
// Disconnect
router.post("/disconnect", async (req, res) => {
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId)
        return res.status(401).json({ error: "No session" });
    await db.delete(graphTokens).where(eq(graphTokens.userId, userId));
    res.json({ ok: true });
});
export default router;
