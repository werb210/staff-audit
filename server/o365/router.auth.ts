import { Router } from "express";
import { getAuthUrl, exchangeCodeForTokens, logGraph } from "./graphClient";

const router = Router();

// 1) Redirect to Microsoft authorize
router.get("/auth", async (req, res) => {
  try {
    const authUrl = getAuthUrl();
    await logGraph(null, "oauth.redirect", "o365");
    res.redirect(authUrl);
  } catch (error: any) {
    await logGraph(null, "oauth.redirect", "o365", false, error?.message);
    res.status(500).json({ ok: false, error: "Failed to generate auth URL" });
  }
});

// 2) OAuth callback
router.get("/auth/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const userId = (req as any).auth?.user?.id;
    
    if (!userId) {
      return res.status(401).send("Authentication required");
    }
    
    if (!code) {
      return res.status(400).send("Authorization code missing");
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    
    // TODO: Save tokens to database
    // await saveTokens(userId, tokens);
    console.log(`[O365] Tokens obtained for user ${userId} - TODO: save to database`);
    
    await logGraph(userId, "oauth.connect", "o365");
    res.redirect("/portal/settings?o365=connected");
  } catch (error: any) {
    await logGraph(null, "oauth.connect", "o365", false, error?.message);
    res.redirect("/portal/settings?o365=error");
  }
});

// 3) Disconnect
router.post("/auth/disconnect", async (req, res) => {
  try {
    const userId = (req as any).auth?.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }
    
    // TODO: Delete tokens and subscriptions from database
    console.log(`[O365] Disconnecting user ${userId} - TODO: implement DB cleanup`);
    
    await logGraph(userId, "oauth.disconnect", "o365");
    res.json({ ok: true });
  } catch (error: any) {
    await logGraph(null, "oauth.disconnect", "o365", false, error?.message);
    res.status(500).json({ ok: false, error: "Disconnect failed" });
  }
});

// 4) Connection status
router.get("/auth/status", async (req, res) => {
  try {
    const userId = (req as any).auth?.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }
    
    // TODO: Check if user has valid tokens
    const connected = false; // await hasValidTokens(userId);
    
    res.json({ 
      ok: true, 
      connected,
      scopes: process.env.MS_SCOPES?.split(",") || []
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: "Status check failed" });
  }
});

export default router;